import { promises as fs } from 'fs';
import { IArchive, IFileEntry } from '../../core/io/IArchive';
import { BufferReader } from '../../core/io/BufferReader';
import { IPakInfo, IPakEntry, ICompressionBlock } from './PakStructures';
import { PakParser } from './PakParser';
import { IKeyManager, AESMode } from '../../crypto/ICrypto';
import { NodeCryptoProvider } from '../../crypto/CryptoProvider';
import { compressionRegistry } from '../../utils/compression/CompressionRegistry';
import { ArchiveError, FileNotFoundError, DecryptionError, CompressionError } from '../../core/errors/UnpakErrors';
import { logger } from '../../core/logging/Logger';

/**
 * Implementation of IArchive for PAK files
 */
export class PakArchive implements IArchive {
  private pakInfo?: IPakInfo;
  private entries: Map<string, IPakEntry> = new Map();
  private fileHandle?: fs.FileHandle;
  private cryptoProvider: NodeCryptoProvider;
  
  constructor(
    private readonly filePath: string,
    private readonly keyManager?: IKeyManager
  ) {
    this.cryptoProvider = new NodeCryptoProvider();
  }
  
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
    
    let processedData = fileData;
    
    // Handle encryption first (decrypt the raw file data)
    if (entry.encrypted) {
      processedData = Buffer.from(await this.decryptFileData(processedData, entry));
    }
    
    // Handle compression after decryption
    if (entry.compressionBlocks.length > 0) {
      return this.decompressFile(processedData, entry);
    }
    
    return processedData;
  }
  
  /**
   * Decrypt file data using AES
   */
  private async decryptFileData(encryptedData: Buffer, entry: IPakEntry): Promise<Buffer> {
    if (!this.keyManager || !this.pakInfo) {
      throw new DecryptionError('File is encrypted but no key manager provided');
    }
    
    const key = await this.keyManager.getKey(this.pakInfo.encryptionKeyGuid);
    if (!key) {
      throw new DecryptionError(`No key found for GUID: ${this.pakInfo.encryptionKeyGuid}`);
    }
    
    try {
      logger.debug('Decrypting file data', { 
        filename: entry.filename,
        encryptedSize: encryptedData.length,
        keyGuid: this.pakInfo.encryptionKeyGuid
      });
      
      // Use AES-256-ECB mode (standard for UE4 PAK files)
      const decryptedData = await this.cryptoProvider.decryptAES(
        encryptedData, 
        key, 
        AESMode.ECB
      );
      
      logger.debug('File decryption complete', {
        filename: entry.filename,
        decryptedSize: decryptedData.length
      });
      
      return decryptedData;
    } catch (error) {
      throw new DecryptionError(
        `Failed to decrypt file '${entry.filename}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Decompress file data using compression blocks
   */
  private async decompressFile(compressedData: Buffer, entry: IPakEntry): Promise<Buffer> {
    if (entry.compressionBlocks.length === 0) {
      // No compression blocks, treat as single compressed chunk
      return this.decompressSingleChunk(compressedData, entry);
    }
    
    // Handle compression blocks
    return this.decompressBlocks(compressedData, entry);
  }
  
  /**
   * Decompress file as a single chunk (no compression blocks)
   */
  private async decompressSingleChunk(compressedData: Buffer, entry: IPakEntry): Promise<Buffer> {
    const compressionMethod = this.getCompressionMethodName(entry.compressionMethod);
    
    if (compressionMethod === 'none') {
      return compressedData;
    }
    
    try {
      logger.debug('Decompressing single chunk', {
        filename: entry.filename,
        compressionMethod,
        compressedSize: compressedData.length,
        uncompressedSize: Number(entry.uncompressedSize)
      });
      
      const decompressed = await compressionRegistry.decompress(compressedData, compressionMethod);
      
      // Verify the decompressed size matches expected
      if (decompressed.length !== Number(entry.uncompressedSize)) {
        logger.warn('Decompressed size mismatch', {
          filename: entry.filename,
          expected: Number(entry.uncompressedSize),
          actual: decompressed.length
        });
      }
      
      return decompressed;
    } catch (error) {
      throw new CompressionError(
        `Failed to decompress file '${entry.filename}': ${error instanceof Error ? error.message : String(error)}`,
        compressionMethod
      );
    }
  }
  
  /**
   * Decompress file using compression blocks
   */
  private async decompressBlocks(compressedData: Buffer, entry: IPakEntry): Promise<Buffer> {
    const decompressedData = Buffer.alloc(Number(entry.uncompressedSize));
    let decompressedOffset = 0;
    
    logger.debug('Decompressing blocks', {
      filename: entry.filename,
      blockCount: entry.compressionBlocks.length,
      totalCompressedSize: compressedData.length,
      totalUncompressedSize: Number(entry.uncompressedSize)
    });
    
    for (let i = 0; i < entry.compressionBlocks.length; i++) {
      const block = entry.compressionBlocks[i];
      const blockCompressedSize = Number(block.compressedEnd - block.compressedStart);
      const blockUncompressedSize = Number(block.uncompressedEnd - block.uncompressedStart);
      
      // Extract the compressed block data
      const blockData = compressedData.subarray(
        Number(block.compressedStart),
        Number(block.compressedEnd)
      );
      
      // Decompress the block
      const compressionMethod = this.getCompressionMethodName(entry.compressionMethod);
      
      let decompressedBlock: Buffer;
      if (compressionMethod === 'none') {
        decompressedBlock = blockData;
      } else {
        try {
          decompressedBlock = await compressionRegistry.decompress(blockData, compressionMethod);
        } catch (error) {
          throw new CompressionError(
            `Failed to decompress block ${i} of file '${entry.filename}': ${error instanceof Error ? error.message : String(error)}`,
            compressionMethod
          );
        }
      }
      
      // Verify block size
      if (decompressedBlock.length !== blockUncompressedSize) {
        logger.warn('Block decompressed size mismatch', {
          filename: entry.filename,
          blockIndex: i,
          expected: blockUncompressedSize,
          actual: decompressedBlock.length
        });
      }
      
      // Copy to output buffer
      const copySize = Math.min(decompressedBlock.length, decompressedData.length - decompressedOffset);
      decompressedBlock.copy(decompressedData, decompressedOffset, 0, copySize);
      decompressedOffset += copySize;
    }
    
    logger.debug('Block decompression complete', {
      filename: entry.filename,
      totalDecompressed: decompressedOffset
    });
    
    return decompressedData;
  }
  
  /**
   * Get compression method name from enum value
   */
  private getCompressionMethodName(method: number): string {
    switch (method) {
      case 0x00: return 'none';
      case 0x01: return 'zlib';
      case 0x02: return 'gzip';
      case 0x08: return 'oodle';
      default: return 'unknown';
    }
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