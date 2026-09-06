/**
 * A subset of WASI preview1.
 *
 * Copied and adapted from: https://github.com/bjorn3/browser_wasi_shim
 */

/** Subset of preview1 errnos */
const ERRNO_SUCCESS = 0;
const ERRNO_BADF = 8;
const ERRNO_INVAL = 28;
const ERRNO_NOENT = 44;
const ERRNO_NOTCAPABLE = 76;

const FILETYPE_DIRECTORY = 3;
const FILETYPE_REGULAR_FILE = 4;

const CLOCKID_REALTIME = 0;
const ALL_RIGHTS = 0xffffffffffffffffn;

const PREOPEN_FD = 3; // the first preopened directory is fd 3
const FIRST_FILE_FD = 4; // any subsequent file descriptors start at 4

/**
 * Carries the exit code out of `proc_exit`, which must not return. Exiting is
 * how a wasi program ends normally, so `start` turns this back into a value.
 */
class ProcExit {
    constructor(readonly code: number) {}
}

export interface WasiFile {
    /** Bytes served to reads. Absent for a write-only file. */
    bytes?: Uint8Array;
    /** Receives each write. Absent for a read-only file. */
    onWrite?: (bytes: Uint8Array) => void;
}

export interface WasiOptions {
    /** argv, including argv[0]. */
    args: string[];
    /** The single preopened directory */
    dir: string;
    /** Files in that directory, by name. */
    files: Map<string, WasiFile>;
    /** Callback for what is written to stdout and stderr */
    onOutput: (bytes: Uint8Array) => void;
}

export interface Wasi {
    imports: WebAssembly.Imports;
    start(instance: WebAssembly.Instance): number;
}

interface OpenFile {
    file: WasiFile;
    /** Read cursor. Unused by write-only files. */
    pos: number;
}

export function createWasi(options: WasiOptions): Wasi {
    const decoder = new TextDecoder();
    const onOutput = options.onOutput;

    const encoder = new TextEncoder();
    const args = options.args.map((arg) => encoder.encode(arg));
    const dirName = encoder.encode(options.dir);

    let memory: WebAssembly.Memory | null = null;

    const view = () => new DataView(memory!.buffer);
    const heap = () => new Uint8Array(memory!.buffer);

    const open = new Map<number, OpenFile>();
    let nextFd = FIRST_FILE_FD;

    /** Walk an iovec array, calling `use` with a view of each buffer. */
    const eachIovec = (
        ptr: number,
        count: number,
        use: (buf: Uint8Array) => number,
    ): number => {
        let total = 0;

        for (let i = 0; i < count; i++) {
            const at = ptr + i * 8;
            const bufPtr = view().getUint32(at, true);
            const bufLen = view().getUint32(at + 4, true);
            const used = use(heap().subarray(bufPtr, bufPtr + bufLen));

            total += used;

            // A short read or write ends the vector.
            if (used < bufLen) {
                break;
            }
        }

        return total;
    };

    const writeTo = (
        target: ((bytes: Uint8Array) => void) | undefined,
        iovs: number,
        iovsLen: number,
        nwrittenPtr: number,
    ): number => {
        if (!target) {
            return ERRNO_BADF;
        }

        const written = eachIovec(iovs, iovsLen, (buf) => {
            // Copy: the callee keeps this past the current call, and the
            // underlying buffer is live wasm memory.
            if (buf.byteLength > 0) {
                target(buf.slice());
            }
            return buf.byteLength;
        });

        view().setUint32(nwrittenPtr, written, true);
        return ERRNO_SUCCESS;
    };

    /** Decode a path argument. Paths are relative to the one preopen. */
    const pathAt = (ptr: number, len: number): string =>
        decoder.decode(heap().subarray(ptr, ptr + len));

    /** The 64 byte `filestat` both stat calls return. */
    const writeFilestat = (statPtr: number, filetype: number, size: number) => {
        new Uint8Array(memory!.buffer, statPtr, 64).fill(0);
        view().setUint8(statPtr + 16, filetype);
        view().setBigUint64(statPtr + 24, 1n, true); // nlink
        view().setBigUint64(statPtr + 32, BigInt(size), true);
    };

    const wasiImport = {
        args_sizes_get(countPtr: number, bufSizePtr: number): number {
            const bytes = args.reduce((n, arg) => n + arg.byteLength + 1, 0);

            view().setUint32(countPtr, args.length, true);
            view().setUint32(bufSizePtr, bytes, true);
            return ERRNO_SUCCESS;
        },

        args_get(argvPtr: number, bufPtr: number): number {
            let at = bufPtr;

            args.forEach((arg, i) => {
                view().setUint32(argvPtr + i * 4, at, true);
                heap().set(arg, at);
                at += arg.byteLength;
                heap()[at++] = 0;
            });

            return ERRNO_SUCCESS;
        },

        environ_sizes_get(countPtr: number, bufSizePtr: number): number {
            view().setUint32(countPtr, 0, true);
            view().setUint32(bufSizePtr, 0, true);
            return ERRNO_SUCCESS;
        },

        environ_get(): number {
            return ERRNO_SUCCESS;
        },

        fd_prestat_get(fd: number, prestatPtr: number): number {
            if (fd !== PREOPEN_FD) {
                return ERRNO_BADF;
            }

            view().setUint8(prestatPtr, 0); // preopentype: dir
            view().setUint32(prestatPtr + 4, dirName.byteLength, true);
            return ERRNO_SUCCESS;
        },

        fd_prestat_dir_name(
            fd: number,
            pathPtr: number,
            pathLen: number,
        ): number {
            if (fd !== PREOPEN_FD) {
                return ERRNO_BADF;
            }

            if (dirName.byteLength > pathLen) {
                return ERRNO_INVAL;
            }

            heap().set(dirName, pathPtr);
            return ERRNO_SUCCESS;
        },

        path_open(
            dirFd: number,
            _dirFlags: number,
            pathPtr: number,
            pathLen: number,
            _oflags: number,
            _rightsBase: bigint,
            _rightsInheriting: bigint,
            _fdFlags: number,
            openedFdPtr: number,
        ): number {
            if (dirFd !== PREOPEN_FD) {
                return ERRNO_BADF;
            }

            const name = pathAt(pathPtr, pathLen);

            // Assume flat directory
            if (name.includes("/")) {
                return ERRNO_NOTCAPABLE;
            }

            const file = options.files.get(name);

            if (!file) {
                return ERRNO_NOENT;
            }

            const fd = nextFd++;
            open.set(fd, { file, pos: 0 });
            view().setUint32(openedFdPtr, fd, true);
            return ERRNO_SUCCESS;
        },

        fd_read(
            fd: number,
            iovs: number,
            iovsLen: number,
            nreadPtr: number,
        ): number {
            if (fd === 0) {
                view().setUint32(nreadPtr, 0, true);
                return ERRNO_SUCCESS;
            }

            const entry = open.get(fd);

            if (!entry?.file.bytes) {
                return ERRNO_BADF;
            }

            const source = entry.file.bytes;

            const read = eachIovec(iovs, iovsLen, (buf) => {
                const n = Math.min(
                    buf.byteLength,
                    source.byteLength - entry.pos,
                );
                buf.set(source.subarray(entry.pos, entry.pos + n));
                entry.pos += n;
                return n;
            });

            view().setUint32(nreadPtr, read, true);
            return ERRNO_SUCCESS;
        },

        fd_write(
            fd: number,
            iovs: number,
            iovsLen: number,
            nwrittenPtr: number,
        ): number {
            // stdout and stderr go to onOutput callback
            if (fd === 1 || fd === 2) {
                return writeTo(onOutput, iovs, iovsLen, nwrittenPtr);
            }

            return writeTo(
                open.get(fd)?.file.onWrite,
                iovs,
                iovsLen,
                nwrittenPtr,
            );
        },

        fd_close(fd: number): number {
            return open.delete(fd) ? ERRNO_SUCCESS : ERRNO_BADF;
        },

        fd_filestat_get(fd: number, statPtr: number): number {
            if (fd === PREOPEN_FD) {
                writeFilestat(statPtr, FILETYPE_DIRECTORY, 0);
                return ERRNO_SUCCESS;
            }

            if (fd >= 0 && fd <= 2) {
                writeFilestat(statPtr, FILETYPE_REGULAR_FILE, 0);
                return ERRNO_SUCCESS;
            }

            const entry = open.get(fd);

            if (!entry) {
                return ERRNO_BADF;
            }

            const size = entry.file.bytes?.byteLength ?? 0;
            writeFilestat(statPtr, FILETYPE_REGULAR_FILE, size);
            return ERRNO_SUCCESS;
        },

        path_filestat_get(
            dirFd: number,
            _flags: number,
            pathPtr: number,
            pathLen: number,
            statPtr: number,
        ): number {
            if (dirFd !== PREOPEN_FD) {
                return ERRNO_BADF;
            }

            const name = pathAt(pathPtr, pathLen);

            // wasi-libc rewrites the preopened dirs own path to "." or "".
            if (name === "." || name === "") {
                writeFilestat(statPtr, FILETYPE_DIRECTORY, 0);
                return ERRNO_SUCCESS;
            }

            const file = options.files.get(name);

            if (!file) {
                return ERRNO_NOENT;
            }

            writeFilestat(
                statPtr,
                FILETYPE_REGULAR_FILE,
                file.bytes?.byteLength ?? 0,
            );
            return ERRNO_SUCCESS;
        },

        fd_fdstat_get(fd: number, statPtr: number): number {
            const known = fd === PREOPEN_FD || (fd >= 0 && fd <= 2);

            if (!known && !open.has(fd)) {
                return ERRNO_BADF;
            }

            const filetype =
                fd === PREOPEN_FD ? FILETYPE_DIRECTORY : FILETYPE_REGULAR_FILE;

            new Uint8Array(memory!.buffer, statPtr, 24).fill(0);
            view().setUint8(statPtr, filetype);
            view().setUint16(statPtr + 2, 0, true); // fs_flags
            view().setBigUint64(statPtr + 8, ALL_RIGHTS, true);
            view().setBigUint64(statPtr + 16, ALL_RIGHTS, true);
            return ERRNO_SUCCESS;
        },

        fd_fdstat_set_flags(_fd: number, _flags: number): number {
            return ERRNO_SUCCESS;
        },

        fd_seek(
            fd: number,
            _offset: bigint,
            _whence: number,
            newOffsetPtr: number,
        ): number {
            const pos = open.get(fd)?.pos ?? 0;
            view().setBigUint64(newOffsetPtr, BigInt(pos), true);
            return ERRNO_SUCCESS;
        },

        clock_time_get(
            clockId: number,
            _precision: bigint,
            timePtr: number,
        ): number {
            const ms =
                clockId === CLOCKID_REALTIME ? Date.now() : performance.now();
            view().setBigUint64(timePtr, BigInt(Math.round(ms * 1e6)), true);
            return ERRNO_SUCCESS;
        },

        proc_exit(code: number): never {
            throw new ProcExit(code);
        },
    };

    return {
        imports: { wasi_snapshot_preview1: wasiImport },

        start(instance) {
            const exports = instance.exports as {
                memory: WebAssembly.Memory;
                _start: () => void;
            };

            memory = exports.memory;

            try {
                exports._start();
                return 0;
            } catch (err) {
                // a solver that exits with a code unwinds through here
                if (err instanceof ProcExit) {
                    return err.code;
                }

                throw err;
            }
        },
    };
}
