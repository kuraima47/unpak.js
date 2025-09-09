/**
 * IoStore file format constants and structures
 * Based on CUE4Parse IoStore implementation
 */

/**
 * IoStore TOC version
 */
export enum IoStoreTocVersion {
  Invalid = 0,
  Initial,
  DirectoryIndex,
  PartitionSize,
  PerfectHash,
  PerfectHashWithOverflow,
  LatestPlusOne,
  Latest = LatestPlusOne - 1
}

/**
 * IoStore container flags
 */
export enum IoContainerFlags {
  None = 0,
  Compressed = (1 << 0),
  Encrypted = (1 << 1),
  Signed = (1 << 2),
  Indexed = (1 << 3)
}

/**
 * IoStore chunk types for UE4
 */
export enum IoChunkType {
  Invalid = 0,
  ExportBundleData = 1,
  BulkData = 2,
  OptionalBulkData = 3,
  MemoryMappedBulkData = 4,
  LoaderGlobalMeta = 5,
  LoaderInitialLoadMeta = 6,
  LoaderGlobalNames = 7,
  LoaderGlobalNameHashes = 8,
  ContainerHeader = 9
}

/**
 * IoStore chunk types for UE5
 */
export enum IoChunkType5 {
  Invalid = 0,
  ExportBundleData = 1,
  BulkData = 2,
  OptionalBulkData = 3,
  MemoryMappedBulkData = 4,
  ScriptObjects = 5,
  ContainerHeader = 6,
  ExternalFile = 7,
  ShaderCodeLibrary = 8,
  ShaderCode = 9,
  PackageStoreEntry = 10,
  DerivedData = 11,
  EditorDerivedData = 12
}

/**
 * IoStore TOC entry metadata flags
 */
export enum IoStoreTocEntryMetaFlags {
  None = 0,
  Compressed = (1 << 0),
  MemoryMapped = (1 << 1)
}

/**
 * IoStore TOC header structure
 */
export interface IIoStoreTocHeader {
  /** TOC magic bytes */
  tocMagic: Buffer;
  
  /** TOC version */
  version: IoStoreTocVersion;
  
  /** Header size for validation */
  tocHeaderSize: number;
  
  /** Number of TOC entries */
  tocEntryCount: number;
  
  /** Number of compressed block entries */
  tocCompressedBlockEntryCount: number;
  
  /** Size of compressed block entries */
  tocCompressedBlockEntrySize: number;
  
  /** Number of compression method names */
  compressionMethodNameCount: number;
  
  /** Length of compression method names */
  compressionMethodNameLength: number;
  
  /** Compression block size */
  compressionBlockSize: number;
  
  /** Directory index size */
  directoryIndexSize: number;
  
  /** Number of partitions */
  partitionCount: number;
  
  /** Container ID */
  containerId: bigint;
  
  /** Encryption key GUID */
  encryptionKeyGuid: string;
  
  /** Container flags */
  containerFlags: IoContainerFlags;
  
  /** Perfect hash seeds count */
  tocChunkPerfectHashSeedsCount: number;
  
  /** Partition size */
  partitionSize: bigint;
  
  /** Chunks without perfect hash count */
  tocChunksWithoutPerfectHashCount: number;
}

/**
 * Combined offset and length (5+5 bytes)
 */
export interface IIoOffsetAndLength {
  /** Offset in the container */
  offset: bigint;
  
  /** Length of the data */
  length: bigint;
}

/**
 * IoStore chunk ID
 */
export interface IIoChunkId {
  /** Chunk ID buffer (12 bytes) */
  id: Buffer;
  
  /** Chunk type */
  chunkType: number;
  
  /** Chunk index */
  chunkIndex: number;
  
  /** Hash with seed for perfect hash lookup */
  hashWithSeed(seed: number): bigint;
  
  /** Check equality with another chunk ID */
  equals(other: IIoChunkId): boolean;
}

/**
 * IoStore TOC entry metadata
 */
export interface IIoStoreTocEntryMeta {
  /** Chunk hash */
  chunkHash: Buffer;
  
  /** Entry flags */
  flags: IoStoreTocEntryMetaFlags;
}

/**
 * IoStore compressed block entry
 */
export interface IIoStoreTocCompressedBlockEntry {
  /** Offset in the container */
  offset: bigint;
  
  /** Compressed size */
  compressedSize: number;
  
  /** Uncompressed size */
  uncompressedSize: number;
  
  /** Compression method index */
  compressionMethodIndex: number;
}

/**
 * Complete IoStore TOC resource
 */
export interface IIoStoreTocResource {
  /** TOC header */
  header: IIoStoreTocHeader;
  
  /** All chunk IDs */
  chunkIds: IIoChunkId[];
  
  /** Offset and length for each chunk */
  chunkOffsetLengths: IIoOffsetAndLength[];
  
  /** Perfect hash seeds (if available) */
  chunkPerfectHashSeeds?: number[];
  
  /** Chunk indices without perfect hash (if any) */
  chunkIndicesWithoutPerfectHash?: number[];
  
  /** Compression blocks */
  compressionBlocks: IIoStoreTocCompressedBlockEntry[];
  
  /** Compression method names */
  compressionMethods: string[];
  
  /** Chunk metadata (if available) */
  chunkMetas?: IIoStoreTocEntryMeta[];
  
  /** Directory index buffer */
  directoryIndexBuffer?: Buffer;
  
  /** Get TOC entry index for chunk ID */
  getTocEntryIndex(chunkId: IIoChunkId): number;
  
  /** Get offset and length for chunk ID */
  getOffsetAndLength(chunkId: IIoChunkId): IIoOffsetAndLength | null;
}

/**
 * Constants for IoStore
 */
export const IOSTORE_CONSTANTS = {
  /** TOC magic template */
  TOC_MAGIC: '-==--==--==--==-',
  
  /** Size of TOC header */
  TOC_HEADER_SIZE: 144,
  
  /** Size of compressed block entry */
  COMPRESSED_BLOCK_ENTRY_SIZE: 12,
  
  /** Compression method name length */
  COMPRESSION_METHOD_NAME_LENGTH: 32,
  
  /** AES block size for alignment */
  AES_BLOCK_SIZE: 16,
} as const;