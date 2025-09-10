/**
 * Interface for file entries in virtual file systems
 */
export interface IFileEntry {
    /**
     * Name of the file
     */
    name: string;

    /**
     * Full path of the file
     */
    path: string;

    /**
     * Size of the file in bytes
     */
    size: number;

    /**
     * Whether this is a directory
     */
    isDirectory: boolean;

    /**
     * Offset in the archive (for compressed files)
     */
    offset?: number;

    /**
     * Compressed size (if different from size)
     */
    compressedSize?: number;

    /**
     * Whether the file is encrypted
     */
    isEncrypted?: boolean;

    /**
     * Compression method used
     */
    compressionMethod?: string;
}