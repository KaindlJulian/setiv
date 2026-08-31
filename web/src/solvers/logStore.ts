/**
 * Where the generated log is kept so it can be downloaded afterwards.
 *
 * Backed by OPFS through a `FileSystemSyncAccessHandle`, which is synchronous by
 * design and worker-only. That synchronicity is the point: the solver blocks on
 * each write, so it self-throttles to disk speed and no backpressure machinery
 * is needed.
 */
export interface LogStore {
    write(bytes: Uint8Array): void;
    finish(): Promise<Blob>;
    discard(): Promise<void>;
}

const logDirName = "runs";

export async function createLogStore(fileName: string): Promise<LogStore> {
    let dir: FileSystemDirectoryHandle;
    let fileHandle: FileSystemFileHandle;
    let handle: FileSystemSyncAccessHandle;

    try {
        const root = await navigator.storage.getDirectory();
        dir = await root.getDirectoryHandle(logDirName, { create: true });

        await cleanupLogs(dir);

        fileHandle = await dir.getFileHandle(fileName, { create: true });
        handle = await fileHandle.createSyncAccessHandle();
    } catch (err) {
        throw new Error(`cannot open the log store: ${err}`);
    }

    handle.truncate(0);
    let offset = 0;

    return {
        write: (bytes) => {
            handle.write(bytes, { at: offset });
            offset += bytes.byteLength;
        },
        finish: async () => {
            handle.flush();
            handle.close();
            return await fileHandle.getFile();
        },
        discard: async () => {
            handle.close();
            await dir.removeEntry(fileName).catch(() => {});
        },
    };
}

async function cleanupLogs(dir: FileSystemDirectoryHandle): Promise<void> {
    const entries = dir.keys();
    for await (const name of entries) {
        await dir.removeEntry(name).catch(() => {});
    }
}
