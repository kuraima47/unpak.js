import { IArchive, IFileEntry } from '../core/io/IArchive';
import { IKeyManager } from '../crypto/ICrypto';

/**
 * Configuration options for opening containers
 */
export interface ContainerOptions {
  /** Key manager for decryption */
  keyManager?: IKeyManager;
  
  /** Whether to load directory index immediately */
  loadDirectoryIndex?: boolean;
  
  /** Maximum file size to read in memory */
  maxFileSize?: number;
  
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Filter options for listing files
 */
export interface ListFilesOptions {
  /** Pattern to match file paths (glob-style) */
  pattern?: string;
  
  /** Only include compressed files */
  compressedOnly?: boolean;
  
  /** Only include encrypted files */
  encryptedOnly?: boolean;
  
  /** File extension filter */
  extensions?: string[];
  
  /** Maximum number of results */
  limit?: number;
}

/**
 * Options for extracting files
 */
export interface ExtractOptions {
  /** Output directory (for file extraction) */
  outputDir?: string;
  
  /** Whether to preserve directory structure */
  preserveStructure?: boolean;
  
  /** Whether to overwrite existing files */
  overwrite?: boolean;
}

/**
 * Main API interface for the unpak.js library
 * Provides a high-level interface for working with UE4/UE5 archives
 */
export interface IUnpakAPI {
  /**
   * Open a container (pak file or IoStore)
   */
  openContainer(pathOrBuffer: string | Buffer, options?: ContainerOptions): Promise<IArchive>;
  
  /**
   * List files in the container
   */
  listFiles(archive: IArchive, options?: ListFilesOptions): Promise<IFileEntry[]>;
  
  /**
   * Extract files from the container
   */
  extractFiles(archive: IArchive, paths: string | string[], options?: ExtractOptions): Promise<Buffer[]>;
  
  /**
   * Read an asset file and return parsed properties
   */
  readAsset(archive: IArchive, path: string): Promise<Record<string, any>>;
  
  /**
   * Read a .uplugin file
   */
  readPlugin(archive: IArchive, path: string): Promise<Record<string, any>>;
  
  /**
   * Read AssetRegistry.bin if present
   */
  readAssetRegistry(archive: IArchive): Promise<Record<string, any>>;
}