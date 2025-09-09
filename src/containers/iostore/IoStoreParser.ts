import { BufferReader } from '../../core/io/BufferReader';
import { 
  IIoStoreTocHeader,
  IIoOffsetAndLength,
  IIoChunkId,
  IIoStoreTocEntryMeta,
  IIoStoreTocCompressedBlockEntry,
  IIoStoreTocResource,
  IoStoreTocVersion,
  IoContainerFlags,
  IoStoreTocEntryMetaFlags,
  IOSTORE_CONSTANTS
} from './IoStoreStructures';
import { ArchiveError } from '../../core/errors/UnpakErrors';
import { logger } from '../../core/logging/Logger';

/**
 * IoStore chunk ID implementation
 */
export class IoChunkId implements IIoChunkId {
  public id: Buffer;
  
  constructor(reader?: BufferReader) {
    this.id = Buffer.alloc(12);
    if (reader) {
      this.id = reader.readBuffer(12);
    }
  }
  
  get chunkType(): number {
    return this.id.readUInt8(0);
  }
  
  get chunkIndex(): number {
    // Read the chunk index from bytes 1-11 (little-endian)
    let index = 0;
    for (let i = 1; i < 12; i++) {
      index += this.id[i] << ((i - 1) * 8);
    }
    return index;
  }
  
  hashWithSeed(seed: number): bigint {
    // Simple hash implementation for perfect hash lookup
    let hash = BigInt(seed);
    for (let i = 0; i < this.id.length; i++) {
      hash = hash * 31n + BigInt(this.id[i]);
    }
    return hash;
  }
  
  equals(other: IIoChunkId): boolean {
    return this.id.equals(other.id);
  }
  
  toString(): string {
    return this.id.toString('hex');
  }
}

/**
 * IoStore offset and length implementation
 */
export class IoOffsetAndLength implements IIoOffsetAndLength {
  private data: Buffer;
  
  constructor(reader?: BufferReader) {
    this.data = Buffer.alloc(10); // 5 bytes offset + 5 bytes length
    if (reader) {
      this.data = reader.readBuffer(10);
    }
  }
  
  get offset(): bigint {
    // Read 5 bytes little-endian
    let offset = 0n;
    for (let i = 0; i < 5; i++) {
      offset += BigInt(this.data[i]) << BigInt(i * 8);
    }
    return offset;
  }
  
  get length(): bigint {
    // Read 5 bytes little-endian starting from offset 5
    let length = 0n;
    for (let i = 0; i < 5; i++) {
      length += BigInt(this.data[5 + i]) << BigInt(i * 8);
    }
    return length;
  }
}

/**
 * IoStore TOC entry metadata implementation
 */
export class IoStoreTocEntryMeta implements IIoStoreTocEntryMeta {
  public chunkHash: Buffer;
  public flags: IoStoreTocEntryMetaFlags;
  
  constructor(reader: BufferReader) {
    this.chunkHash = reader.readBuffer(20); // SHA1 hash
    this.flags = reader.readUInt8();
  }
}

/**
 * IoStore compressed block entry implementation
 */
export class IoStoreTocCompressedBlockEntry implements IIoStoreTocCompressedBlockEntry {
  private data: Buffer;
  
  constructor(reader: BufferReader) {
    this.data = reader.readBuffer(12); // 5+3+3+1 bytes
  }
  
  get offset(): bigint {
    // Read 5 bytes little-endian
    let offset = 0n;
    for (let i = 0; i < 5; i++) {
      offset += BigInt(this.data[i]) << BigInt(i * 8);
    }
    return offset;
  }
  
  get compressedSize(): number {
    // Read 3 bytes starting from offset 5
    const bytes = this.data.subarray(5, 8);
    return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16);
  }
  
  get uncompressedSize(): number {
    // Read 3 bytes starting from offset 8
    const bytes = this.data.subarray(8, 11);
    return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16);
  }
  
  get compressionMethodIndex(): number {
    return this.data[11];
  }
}

/**
 * IoStore TOC resource implementation
 */
export class IoStoreTocResource implements IIoStoreTocResource {
  public header!: IIoStoreTocHeader;
  public chunkIds: IIoChunkId[] = [];
  public chunkOffsetLengths: IIoOffsetAndLength[] = [];
  public chunkPerfectHashSeeds?: number[];
  public chunkIndicesWithoutPerfectHash?: number[];
  public compressionBlocks: IIoStoreTocCompressedBlockEntry[] = [];
  public compressionMethods: string[] = [];
  public chunkMetas?: IIoStoreTocEntryMeta[];
  public directoryIndexBuffer?: Buffer;
  
  private chunkIdToIndex: Map<string, number> = new Map();
  
  getTocEntryIndex(chunkId: IIoChunkId): number {
    // Try perfect hash first if available
    if (this.chunkPerfectHashSeeds && this.chunkPerfectHashSeeds.length > 0) {
      return this.getTocEntryIndexPerfectHash(chunkId);
    }
    
    // Fall back to map lookup
    const key = chunkId.id.toString('hex');
    return this.chunkIdToIndex.get(key) ?? -1;
  }
  
  private getTocEntryIndexPerfectHash(chunkId: IIoChunkId): number {
    if (!this.chunkPerfectHashSeeds || this.chunkPerfectHashSeeds.length === 0) {
      return -1;
    }
    
    const chunkCount = this.header.tocEntryCount;
    if (chunkCount === 0) return -1;
    
    const seedCount = this.chunkPerfectHashSeeds.length;
    const seedIndex = Number(chunkId.hashWithSeed(0) % BigInt(seedCount));
    const seed = this.chunkPerfectHashSeeds[seedIndex];
    
    if (seed === 0) return -1;
    
    let slot: number;
    if (seed < 0) {
      const seedAsIndex = -seed - 1;
      if (seedAsIndex < chunkCount) {
        slot = seedAsIndex;
      } else {
        // Entry without perfect hash
        const key = chunkId.id.toString('hex');
        return this.chunkIdToIndex.get(key) ?? -1;
      }
    } else {
      slot = Number(chunkId.hashWithSeed(seed) % BigInt(chunkCount));
    }
    
    if (this.chunkIds[slot]?.equals(chunkId)) {
      return slot;
    }
    
    return -1;
  }
  
  getOffsetAndLength(chunkId: IIoChunkId): IIoOffsetAndLength | null {
    const index = this.getTocEntryIndex(chunkId);
    return index !== -1 ? this.chunkOffsetLengths[index] : null;
  }
  
  /**
   * Parse IoStore TOC from buffer
   */
  public parse(reader: BufferReader, readDirectoryIndex: boolean = true): void {
    // Parse header
    this.header = this.parseHeader(reader);
    
    // Validate header
    this.validateHeader();
    
    // Parse chunk IDs
    this.parseChunkIds(reader);
    
    // Parse chunk offset/lengths
    this.parseChunkOffsetLengths(reader);
    
    // Parse perfect hash data
    this.parsePerfectHashData(reader);
    
    // Parse compression blocks
    this.parseCompressionBlocks(reader);
    
    // Parse compression methods
    this.parseCompressionMethods(reader);
    
    // Skip signatures if present
    this.skipSignatures(reader);
    
    // Parse directory index
    if (readDirectoryIndex) {
      this.parseDirectoryIndex(reader);
    }
    
    logger.info('Parsed IoStore TOC', {
      version: this.header.version,
      entryCount: this.header.tocEntryCount,
      compressionBlocks: this.header.tocCompressedBlockEntryCount,
      encrypted: !!(this.header.containerFlags & IoContainerFlags.Encrypted),
      indexed: !!(this.header.containerFlags & IoContainerFlags.Indexed)
    });
  }
  
  private parseHeader(reader: BufferReader): IIoStoreTocHeader {
    const tocMagic = reader.readBuffer(16);
    
    // Validate magic
    if (!tocMagic.equals(Buffer.from(IOSTORE_CONSTANTS.TOC_MAGIC))) {
      throw new ArchiveError('Invalid IoStore TOC magic');
    }
    
    return {
      tocMagic,
      version: reader.readUInt8(),
      reserved0: reader.readUInt8(),
      reserved1: reader.readUInt16(),
      tocHeaderSize: reader.readUInt32(),
      tocEntryCount: reader.readUInt32(),
      tocCompressedBlockEntryCount: reader.readUInt32(),
      tocCompressedBlockEntrySize: reader.readUInt32(),
      compressionMethodNameCount: reader.readUInt32(),
      compressionMethodNameLength: reader.readUInt32(),
      compressionBlockSize: reader.readUInt32(),
      directoryIndexSize: reader.readUInt32(),
      partitionCount: reader.readUInt32(),
      containerId: reader.readUInt64(),
      encryptionKeyGuid: this.readGuid(reader),
      containerFlags: reader.readUInt8(),
      reserved3: reader.readUInt8(),
      reserved4: reader.readUInt16(),
      tocChunkPerfectHashSeedsCount: reader.readUInt32(),
      partitionSize: reader.readUInt64(),
      tocChunksWithoutPerfectHashCount: reader.readUInt32(),
      reserved7: reader.readUInt32(),
      reserved8: this.readReserved8(reader)
    } as IIoStoreTocHeader;
  }
  
  private readGuid(reader: BufferReader): string {
    const guidBuffer = reader.readBuffer(16);
    
    // Convert to standard GUID format
    const d1 = guidBuffer.readUInt32LE(0);
    const d2 = guidBuffer.readUInt16LE(4);
    const d3 = guidBuffer.readUInt16LE(6);
    const d4 = guidBuffer.subarray(8, 16);
    
    return [
      d1.toString(16).padStart(8, '0'),
      d2.toString(16).padStart(4, '0'),
      d3.toString(16).padStart(4, '0'),
      d4.subarray(0, 2).toString('hex'),
      d4.subarray(2, 8).toString('hex')
    ].join('-');
  }
  
  private readReserved8(reader: BufferReader): bigint[] {
    const reserved = [];
    for (let i = 0; i < 5; i++) {
      reserved.push(reader.readUInt64());
    }
    return reserved;
  }
  
  private validateHeader(): void {
    if (this.header.tocHeaderSize !== IOSTORE_CONSTANTS.TOC_HEADER_SIZE) {
      throw new ArchiveError('IoStore TOC header size mismatch');
    }
    
    if (this.header.tocCompressedBlockEntrySize !== IOSTORE_CONSTANTS.COMPRESSED_BLOCK_ENTRY_SIZE) {
      throw new ArchiveError('IoStore compressed block entry size mismatch');
    }
    
    if (this.header.version < IoStoreTocVersion.DirectoryIndex) {
      throw new ArchiveError('Unsupported IoStore TOC version');
    }
    
    // Handle legacy versions
    if (this.header.version < IoStoreTocVersion.PartitionSize) {
      (this.header as any).partitionCount = 1;
      (this.header as any).partitionSize = 0xFFFFFFFFFFFFFFFFn;
    }
  }
  
  private parseChunkIds(reader: BufferReader): void {
    this.chunkIds = [];
    this.chunkIdToIndex.clear();
    
    for (let i = 0; i < this.header.tocEntryCount; i++) {
      const chunkId = new IoChunkId(reader);
      this.chunkIds.push(chunkId);
      
      // Build index map for non-perfect-hash lookup
      if (this.header.version < IoStoreTocVersion.PerfectHash) {
        const key = chunkId.id.toString('hex');
        this.chunkIdToIndex.set(key, i);
      }
    }
  }
  
  private parseChunkOffsetLengths(reader: BufferReader): void {
    this.chunkOffsetLengths = [];
    
    for (let i = 0; i < this.header.tocEntryCount; i++) {
      this.chunkOffsetLengths.push(new IoOffsetAndLength(reader));
    }
  }
  
  private parsePerfectHashData(reader: BufferReader): void {
    let perfectHashSeedsCount = 0;
    let chunksWithoutPerfectHashCount = 0;
    
    if (this.header.version >= IoStoreTocVersion.PerfectHashWithOverflow) {
      perfectHashSeedsCount = this.header.tocChunkPerfectHashSeedsCount;
      chunksWithoutPerfectHashCount = this.header.tocChunksWithoutPerfectHashCount;
    } else if (this.header.version >= IoStoreTocVersion.PerfectHash) {
      perfectHashSeedsCount = this.header.tocChunkPerfectHashSeedsCount;
    }
    
    // Read perfect hash seeds
    if (perfectHashSeedsCount > 0) {
      this.chunkPerfectHashSeeds = [];
      for (let i = 0; i < perfectHashSeedsCount; i++) {
        this.chunkPerfectHashSeeds.push(reader.readInt32());
      }
    }
    
    // Read chunks without perfect hash
    if (chunksWithoutPerfectHashCount > 0) {
      this.chunkIndicesWithoutPerfectHash = [];
      for (let i = 0; i < chunksWithoutPerfectHashCount; i++) {
        this.chunkIndicesWithoutPerfectHash.push(reader.readInt32());
      }
      
      // Build index map for chunks without perfect hash
      for (const chunkIndex of this.chunkIndicesWithoutPerfectHash) {
        const chunkId = this.chunkIds[chunkIndex];
        if (chunkId) {
          const key = chunkId.id.toString('hex');
          this.chunkIdToIndex.set(key, chunkIndex);
        }
      }
    }
  }
  
  private parseCompressionBlocks(reader: BufferReader): void {
    this.compressionBlocks = [];
    
    for (let i = 0; i < this.header.tocCompressedBlockEntryCount; i++) {
      this.compressionBlocks.push(new IoStoreTocCompressedBlockEntry(reader));
    }
  }
  
  private parseCompressionMethods(reader: BufferReader): void {
    this.compressionMethods = ['None']; // Index 0 is always 'None'
    
    for (let i = 0; i < this.header.compressionMethodNameCount; i++) {
      const nameBuffer = reader.readBuffer(this.header.compressionMethodNameLength);
      
      // Find null terminator
      let length = 0;
      while (length < nameBuffer.length && nameBuffer[length] !== 0) {
        length++;
      }
      
      const methodName = nameBuffer.toString('utf8', 0, length);
      this.compressionMethods.push(methodName);
    }
  }
  
  private skipSignatures(reader: BufferReader): void {
    if (this.header.containerFlags & IoContainerFlags.Signed) {
      const hashSize = reader.readInt32();
      reader.readBuffer(hashSize); // Skip TOC signature
      reader.readBuffer(hashSize); // Skip Block signature
      
      // Skip chunk block signatures
      const signatureSize = 20; // SHA1 hash size
      const totalSignatureSize = this.header.tocCompressedBlockEntryCount * signatureSize;
      if (totalSignatureSize > 0) {
        reader.readBuffer(totalSignatureSize);
      }
    }
  }
  
  private parseDirectoryIndex(reader: BufferReader): void {
    if ((this.header.containerFlags & IoContainerFlags.Indexed) && this.header.directoryIndexSize > 0) {
      this.directoryIndexBuffer = reader.readBuffer(this.header.directoryIndexSize);
    }
  }
}

/**
 * IoStore parser utility class
 */
export class IoStoreParser {
  /**
   * Parse IoStore TOC from buffer
   */
  static parseToc(buffer: Buffer, readDirectoryIndex: boolean = true): IIoStoreTocResource {
    const reader = new BufferReader(buffer);
    const toc = new IoStoreTocResource();
    toc.parse(reader, readDirectoryIndex);
    return toc;
  }
}