/**
 * Archive interface for handling different container formats (Pak, IoStore, etc.)
 * Provides unified access to file entries regardless of the underlying storage format
 */
export interface IArchive {
  /** Archive name/path for identification */
  readonly name: string;
  
  /** Whether the archive is encrypted */
  readonly isEncrypted: boolean;
  
  /** Number of files in the archive */
  readonly fileCount: number;

  // File operations
  hasFile(path: string): boolean;
  getFile(path: string): Promise<Buffer | null>;
  getFileInfo(path: string): IFileEntry | null;
  listFiles(pattern?: string): IFileEntry[];
  
  // Compatibility aliases
  getFileList?(): IFileEntry[];
  readFile?(path: string): Promise<Buffer | null>;
  
  // Metadata
  getVersion(): number;
  getMountPoint(): string;
  
  // Resource management
  close(): Promise<void>;
}

/**
 * Represents a file entry within an archive
 */
export interface IFileEntry {
  /** Full path within the archive */
  readonly path: string;
  
  /** File size when uncompressed */
  readonly size: number;
  
  /** Compressed size (may be same as size if not compressed) */
  readonly compressedSize: number;
  
  /** Whether the file is compressed */
  readonly isCompressed: boolean;
  
  /** Whether the file is encrypted */
  readonly isEncrypted: boolean;
  
  /** Compression method used */
  readonly compressionMethod: string;
  
  /** File offset in the archive */
  readonly offset: bigint;
  
  /** Hash of the file (if available) */
  readonly hash?: string;
}