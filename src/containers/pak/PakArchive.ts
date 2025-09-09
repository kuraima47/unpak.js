import { promises as fs } from 'fs';
import { IArchive, IFileEntry } from '../../core/io/IArchive';
import { BufferReader } from '../../core/io/BufferReader';
import { IPakInfo, IPakEntry } from './PakStructures';
import { PakParser } from './PakParser';
import { IKeyManager } from '../../crypto/ICrypto';
import { ArchiveError, FileNotFoundError, DecryptionError } from '../../core/errors/UnpakErrors';
import { logger } from '../../core/logging/Logger';

/**
 * Implementation of IArchive for PAK files
 */
export class PakArchive implements IArchive {
  private pakInfo?: IPakInfo;
  private entries: Map<string, IPakEntry> = new Map();
  private fileHandle?: fs.FileHandle;
  
  constructor(
    private readonly filePath: string,
    private readonly keyManager?: IKeyManager
  ) {}
  
  get name(): string {
    return this.filePath;
  }
  
  get isEncrypted(): boolean {
    return this.pakInfo?.encryptedIndex ?? false;
  }
  
  get fileCount(): number {
    return this.entries.size;
  }
  
  /**
   * Initialize the archive by reading the PAK info and index
   */
  async initialize(): Promise<void> {
    try {
      this.fileHandle = await fs.open(this.filePath, 'r');
      const stats = await this.fileHandle.stat();
      
      // Read the entire file into memory for now (could be optimized for large files)
      const buffer = Buffer.alloc(stats.size);
      await this.fileHandle.read(buffer, 0, stats.size, 0);
      
      const reader = new BufferReader(buffer);
      
      // Parse PAK info from footer
      this.pakInfo = PakParser.parsePakInfo(reader);
      
      // Parse index
      const pakEntries = PakParser.parseIndex(reader, this.pakInfo);
      
      // Build filename lookup map
      for (const entry of pakEntries) {
        this.entries.set(entry.filename.toLowerCase(), entry);
      }
      
      logger.info('Initialized PAK archive', {
        file: this.filePath,
        version: this.pakInfo.version,
        entryCount: this.entries.size,
        encrypted: this.isEncrypted
      });
      
    } catch (error) {
      await this.close();
      throw new ArchiveError(
        `Failed to initialize PAK archive: ${error instanceof Error ? error.message : String(error)}`,
        this.filePath
      );
    }
  }
  
  hasFile(path: string): boolean {
    return this.entries.has(path.toLowerCase());
  }
  
  async getFile(path: string): Promise<Buffer | null> {
    const entry = this.entries.get(path.toLowerCase());
    if (!entry) {
      return null;
    }
    
    return this.extractFile(entry);
  }
  
  getFileInfo(path: string): IFileEntry | null {
    const entry = this.entries.get(path.toLowerCase());
    if (!entry) {
      return null;
    }
    
    return {
      path: entry.filename,
      size: Number(entry.uncompressedSize),
      compressedSize: Number(entry.size),
      isCompressed: entry.compressionBlocks.length > 0,
      isEncrypted: entry.encrypted,
      compressionMethod: entry.compressionMethod.toString(),
      offset: entry.offset,
      hash: entry.hash.toString('hex')
    };
  }
  
  listFiles(pattern?: string): IFileEntry[] {
    const files: IFileEntry[] = [];
    
    for (const entry of this.entries.values()) {
      if (!pattern || this.matchesPattern(entry.filename, pattern)) {
        const fileInfo = this.getFileInfo(entry.filename);
        if (fileInfo) {
          files.push(fileInfo);
        }
      }
    }
    
    return files;
  }
  
  getVersion(): number {
    return this.pakInfo?.version ?? 0;
  }
  
  getMountPoint(): string {
    // Could be extracted during index parsing, for now return empty
    return '';
  }
  
  async close(): Promise<void> {
    if (this.fileHandle) {
      await this.fileHandle.close();
      this.fileHandle = undefined;
    }
    this.entries.clear();
    this.pakInfo = undefined;
  }
  
  /**
   * Extract file data from the PAK
   */
  private async extractFile(entry: IPakEntry): Promise<Buffer> {
    if (!this.fileHandle) {
      throw new ArchiveError('PAK archive not initialized');
    }
    
    // Read the file data
    const fileData = Buffer.alloc(Number(entry.size));
    await this.fileHandle.read(fileData, 0, Number(entry.size), Number(entry.offset));
    
    // Handle encryption
    if (entry.encrypted) {
      if (!this.keyManager || !this.pakInfo) {
        throw new DecryptionError('File is encrypted but no key manager provided');
      }
      
      const key = await this.keyManager.getKey(this.pakInfo.encryptionKeyGuid);
      if (!key) {
        throw new DecryptionError(`No key found for GUID: ${this.pakInfo.encryptionKeyGuid}`);
      }
      
      // TODO: Implement AES decryption for file data
      logger.warn('File decryption not yet implemented', { filename: entry.filename });
    }
    
    // Handle compression
    if (entry.compressionBlocks.length > 0) {
      return this.decompressFile(fileData, entry);
    }
    
    return fileData;
  }
  
  /**
   * Decompress file data using compression blocks
   */
  private async decompressFile(compressedData: Buffer, entry: IPakEntry): Promise<Buffer> {
    // For now, just return the compressed data
    // TODO: Implement proper decompression based on compression method
    logger.warn('File decompression not yet implemented', { 
      filename: entry.filename,
      compressionMethod: entry.compressionMethod,
      blockCount: entry.compressionBlocks.length
    });
    
    return compressedData;
  }
  
  /**
   * Simple pattern matching (could be enhanced with proper glob support)
   */
  private matchesPattern(filename: string, pattern: string): boolean {
    // Convert simple wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(filename);
  }
}