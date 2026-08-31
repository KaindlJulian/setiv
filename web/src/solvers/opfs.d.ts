// Origin private file system types. Only usable from web workers, and only the
// classes we use.
//
// See
// - https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
// - https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle
// - https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle

interface FileSystemFileHandle {
    createSyncAccessHandle(): Promise<FileSystemSyncAccessHandle>;
}

interface FileSystemSyncAccessHandle {
    close(): void;
    flush(): void;
    getSize(): number;
    read(
        buffer: ArrayBufferView | ArrayBuffer,
        options?: FileSystemReadWriteOptions,
    ): number;
    truncate(newSize: number): void;
    write(
        buffer: ArrayBufferView | ArrayBuffer,
        options?: FileSystemReadWriteOptions,
    ): number;
}

interface FileSystemReadWriteOptions {
    at?: number;
}
