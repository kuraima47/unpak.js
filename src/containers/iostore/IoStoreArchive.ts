import { promises as fs } from 'fs';
import { IArchive, IFileEntry } from '../../core/io/IArchive';
import { BufferReader } from '../../core/io/BufferReader';
import { 
  IIoStoreTocResource,
  IIoChunkId,
  IoContainerFlags,
  IoChunkType,
  IoChunkType5,
  IOSTORE_CONSTANTS
} from './IoStoreStructures';
import { IoStoreParser, IoChunkId } from './IoStoreParser';
import { IKeyManager, AESMode } from '../../crypto/ICrypto';
import { NodeCryptoProvider } from '../../crypto/CryptoProvider';
import { compressionRegistry } from '../../utils/compression/CompressionRegistry';
import { ArchiveError, FileNotFoundError, DecryptionError, CompressionError } from '../../core/errors/UnpakErrors';
import { logger } from '../../core/logging/Logger';

/**
 * IoStore file entry implementing IFileEntry
 */
export class IoStoreFileEntry implements IFileEntry {
  constructor(
    public readonly path: string,
    public readonly size: number,
    public readonly compressedSize: number,
    public readonly isCompressed: boolean,
    public readonly isEncrypted: boolean,
    public readonly compressionMethod: string,
    public readonly offset: bigint,
    public readonly hash: string,
    public readonly chunkId: IIoChunkId
  ) {}
}

/**
 * Implementation of IArchive for IoStore containers (.utoc/.ucas files)
 */
export class IoStoreArchive implements IArchive {
  private toc?: IIoStoreTocResource;
  private containerHandles: fs.FileHandle[] = [];
  private cryptoProvider: NodeCryptoProvider;
  private decryptionKey?: Buffer;
  private entries: Map<string, IoStoreFileEntry> = new Map();
  
  constructor(
    private readonly containerPath: string, // Path without .utoc/.ucas extension
    private readonly keyManager?: IKeyManager,
    private readonly ueVersion: number = 5 // UE4 = 4, UE5 = 5
  ) {
    this.cryptoProvider = new NodeCryptoProvider();
  }
  
  get name(): string {
    return this.containerPath;
  }
  
  get isEncrypted(): boolean {
    return this.toc ? !!(this.toc.header.containerFlags & IoContainerFlags.Encrypted) : false;
  }
  
  get fileCount(): number {
    return this.entries.size;
  }
  
  /**
   * Initialize the archive by reading the TOC and setting up container files
   */
  async initialize(): Promise<void> {
    try {
      // Read TOC file
      const tocPath = `${this.containerPath}.utoc`;
      const tocBuffer = await fs.readFile(tocPath);
      this.toc = IoStoreParser.parseToc(tocBuffer, true);
      
      // Open container files
      await this.openContainerFiles();
      
      // Setup decryption if needed
      if (this.isEncrypted) {
        await this.setupDecryption();
      }
      
      // Build file entries from directory index
      await this.buildFileIndex();
      
      logger.info('Initialized IoStore archive', {
        container: this.containerPath,
        version: this.toc.header.version,
        entryCount: this.toc.header.tocEntryCount,
        fileCount: this.entries.size,
        encrypted: this.isEncrypted,
        indexed: !!(this.toc.header.containerFlags & IoContainerFlags.Indexed)
      });
      
    } catch (error) {
      await this.close();
      throw new ArchiveError(
        `Failed to initialize IoStore archive: ${error instanceof Error ? error.message : String(error)}`,
        this.containerPath
      );
    }
  }
  
  private async openContainerFiles(): Promise<void> {
    if (!this.toc) {
      throw new ArchiveError('TOC not loaded');
    }
    
    for (let partitionIndex = 0; partitionIndex < this.toc.header.partitionCount; partitionIndex++) {
      let containerFilePath = this.containerPath;
      if (partitionIndex > 0) {
        containerFilePath += `_s${partitionIndex}`;
      }
      containerFilePath += '.ucas';
      
      try {
        const handle = await fs.open(containerFilePath, 'r');
        this.containerHandles[partitionIndex] = handle;
      } catch (error) {
        throw new ArchiveError(`Failed to open IoStore container file: ${containerFilePath}`);
      }
    }
  }
  
  private async setupDecryption(): Promise<void> {
    if (!this.keyManager || !this.toc) {
      throw new DecryptionError('IoStore container is encrypted but no key manager provided');
    }
    
    const key = await this.keyManager.getKey(this.toc.header.encryptionKeyGuid);
    if (!key) {
      throw new DecryptionError(`No key found for GUID: ${this.toc.header.encryptionKeyGuid}`);
    }
    
    this.decryptionKey = key;
  }
  
  private async buildFileIndex(): Promise<void> {
    if (!this.toc) {
      throw new ArchiveError('TOC not loaded');
    }
    
    this.entries.clear();
    
    // If there's a directory index, parse it to get file names
    if (this.toc.directoryIndexBuffer && (this.toc.header.containerFlags & IoContainerFlags.Indexed)) {
      await this.parseDirectoryIndex();
    } else {
      // No directory index, create entries from chunk IDs
      this.createGenericEntries();
    }
  }
  
  private async parseDirectoryIndex(): Promise<void> {
    if (!this.toc || !this.toc.directoryIndexBuffer) {
      return;
    }
    
    // For now, create a simplified implementation
    // Full directory index parsing would require implementing the directory index format
    logger.warn('Directory index parsing not fully implemented yet', {
      indexSize: this.toc.directoryIndexBuffer.length
    });
    
    this.createGenericEntries();
  }
  
  private createGenericEntries(): void {
    if (!this.toc) {
      return;
    }
    
    const exportBundleDataChunkType = this.ueVersion >= 5 ? IoChunkType5.ExportBundleData : IoChunkType.ExportBundleData;
    
    for (let i = 0; i < this.toc.chunkIds.length; i++) {
      const chunkId = this.toc.chunkIds[i];
      const offsetLength = this.toc.chunkOffsetLengths[i];
      
      // Only include export bundle data chunks (these represent actual files)
      if (chunkId.chunkType === exportBundleDataChunkType) {
        const fileName = `chunk_${chunkId.toString()}.uasset`;
        const isCompressed = this.isChunkCompressed(i);
        const compressionMethod = this.getChunkCompressionMethod(i);
        
        const entry = new IoStoreFileEntry(
          fileName,
          Number(offsetLength.length), // Uncompressed size
          Number(offsetLength.length), // For now, assume same as uncompressed
          isCompressed,
          this.isEncrypted,
          compressionMethod,
          offsetLength.offset,
          chunkId.toString(),
          chunkId
        );
        
        this.entries.set(fileName.toLowerCase(), entry);
      }
    }
  }
  
  private isChunkCompressed(chunkIndex: number): boolean {
    if (!this.toc || !this.toc.chunkMetas || chunkIndex >= this.toc.chunkMetas.length) {
      return false;
    }
    
    return !!(this.toc.chunkMetas[chunkIndex].flags & 0x1); // Compressed flag
  }
  
  private getChunkCompressionMethod(chunkIndex: number): string {
    // For IoStore, compression is determined by the compression blocks
    // This is a simplified implementation
    return 'none';
  }
  
  hasFile(path: string): boolean {
    return this.entries.has(path.toLowerCase());
  }
  
  async getFile(path: string): Promise<Buffer | null> {
    const entry = this.entries.get(path.toLowerCase());
    if (!entry) {
      return null;
    }
    
    return this.extractChunk(entry.chunkId);
  }
  
  getFileInfo(path: string): IFileEntry | null {
    return this.entries.get(path.toLowerCase()) || null;
  }
  
  listFiles(pattern?: string): IFileEntry[] {
    const files: IFileEntry[] = [];
    
    for (const entry of this.entries.values()) {
      if (!pattern || this.matchesPattern(entry.path, pattern)) {
        files.push(entry);
      }
    }
    
    return files;
  }
  
  getVersion(): number {
    return this.toc?.header.version ?? 0;
  }
  
  getMountPoint(): string {
    // TODO: Extract from directory index when implemented
    return '';
  }
  
  async close(): Promise<void> {
    // Close all container file handles
    for (const handle of this.containerHandles) {
      try {
        await handle.close();
      } catch (error) {
        // Ignore close errors
      }
    }
    
    this.containerHandles = [];
    this.entries.clear();
    this.toc = undefined;
    this.decryptionKey = undefined;
  }
  
  /**
   * Extract chunk data from the IoStore containers
   */
  private async extractChunk(chunkId: IIoChunkId): Promise<Buffer> {
    if (!this.toc) {
      throw new ArchiveError('IoStore archive not initialized');
    }
    
    const offsetLength = this.toc.getOffsetAndLength(chunkId);
    if (!offsetLength) {
      throw new FileNotFoundError(`Chunk not found: ${chunkId.toString()}`);
    }
    
    const offset = Number(offsetLength.offset);
    const length = Number(offsetLength.length);
    
    // Determine which partition contains this chunk
    const partitionIndex = Math.floor(offset / Number(this.toc.header.partitionSize));
    const partitionOffset = offset % Number(this.toc.header.partitionSize);
    
    if (partitionIndex >= this.containerHandles.length) {
      throw new ArchiveError(`Partition ${partitionIndex} not available`);
    }
    
    // Read chunk data using compression blocks
    return this.readChunkBlocks(chunkId, partitionIndex, partitionOffset, length);
  }
  
  /**
   * Read chunk data using compression blocks
   */
  private async readChunkBlocks(
    chunkId: IIoChunkId, 
    partitionIndex: number, 
    baseOffset: number, 
    totalLength: number
  ): Promise<Buffer> {
    if (!this.toc) {
      throw new ArchiveError('TOC not loaded');
    }
    
    const compressionBlockSize = this.toc.header.compressionBlockSize;
    const firstBlockIndex = Math.floor(baseOffset / compressionBlockSize);
    const lastBlockIndex = Math.floor((baseOffset + totalLength - 1) / compressionBlockSize);
    
    const outputBuffer = Buffer.alloc(totalLength);
    let outputOffset = 0;
    let remainingLength = totalLength;
    let currentBlockOffset = baseOffset % compressionBlockSize;
    
    for (let blockIndex = firstBlockIndex; blockIndex <= lastBlockIndex; blockIndex++) {
      if (blockIndex >= this.toc.compressionBlocks.length) {
        throw new ArchiveError(`Compression block ${blockIndex} out of range`);
      }
      
      const block = this.toc.compressionBlocks[blockIndex];
      const blockData = await this.readCompressionBlock(block, partitionIndex);
      
      // Copy the required portion of this block
      const copyLength = Math.min(compressionBlockSize - currentBlockOffset, remainingLength);
      blockData.copy(outputBuffer, outputOffset, currentBlockOffset, currentBlockOffset + copyLength);
      
      outputOffset += copyLength;
      remainingLength -= copyLength;
      currentBlockOffset = 0; // After first block, always start from beginning
    }
    
    return outputBuffer;
  }
  
  /**
   * Read and decompress a single compression block
   */
  private async readCompressionBlock(
    block: any, // IIoStoreTocCompressedBlockEntry
    partitionIndex: number
  ): Promise<Buffer> {
    const handle = this.containerHandles[partitionIndex];
    const rawSize = this.alignToAES(block.compressedSize);
    
    // Read compressed data
    const compressedBuffer = Buffer.alloc(rawSize);
    await handle.read(compressedBuffer, 0, rawSize, Number(block.offset));
    
    // Decrypt if needed
    let processedBuffer = compressedBuffer;
    if (this.isEncrypted && this.decryptionKey) {
      processedBuffer = Buffer.from(await this.cryptoProvider.decryptAES(
        compressedBuffer,
        this.decryptionKey,
        AESMode.ECB
      ));
    }
    
    // Decompress if needed
    if (block.compressionMethodIndex === 0) {
      // No compression
      return processedBuffer.subarray(0, block.uncompressedSize);
    } else {
      // Decompress
      const compressionMethod = this.toc!.compressionMethods[block.compressionMethodIndex];
      const compressedData = processedBuffer.subarray(0, block.compressedSize);
      
      try {
        const decompressed = await compressionRegistry.decompress(compressedData, compressionMethod.toLowerCase());
        
        if (decompressed.length !== block.uncompressedSize) {
          logger.warn('Decompressed block size mismatch', {
            expected: block.uncompressedSize,
            actual: decompressed.length
          });
        }
        
        return decompressed;
      } catch (error) {
        throw new CompressionError(
          `Failed to decompress IoStore block: ${error instanceof Error ? error.message : String(error)}`,
          compressionMethod
        );
      }
    }
  }
  
  /**
   * Align size to AES block boundary
   */
  private alignToAES(size: number): number {
    const remainder = size % IOSTORE_CONSTANTS.AES_BLOCK_SIZE;
    return remainder === 0 ? size : size + (IOSTORE_CONSTANTS.AES_BLOCK_SIZE - remainder);
  }
  
  /**
   * Simple pattern matching for file filtering
   */
  private matchesPattern(filename: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(filename);
  }
}