/**
 * PAK file format constants and enums
 */

export const PAK_MAGIC = 0x5A6F12E1;

/**
 * Supported PAK file versions
 */
export enum PakVersion {
  INITIAL = 1,
  NO_TIMESTAMPS = 2,
  COMPRESSION_ENCRYPTION = 3,
  INDEX_ENCRYPTION = 4,
  RELATIVE_CHUNK_OFFSETS = 5,
  DELETE_RECORDS = 6,
  ENCRYPTION_KEY_GUID = 7,
  FNAME_BASED_COMPRESSION_METHOD = 8,
  FROZEN_INDEX = 9,
}

/**
 * Compression methods supported by PAK files
 */
export enum CompressionMethod {
  NONE = 0x00,
  ZLIB = 0x01,
  GZIP = 0x02,
  CUSTOM = 0x04,
  OODLE = 0x08,
}

/**
 * PAK file footer/info structure
 */
export interface IPakInfo {
  /** Encryption key GUID */
  encryptionKeyGuid: string;
  
  /** Whether the PAK index is encrypted */
  encryptedIndex: boolean;
  
  /** Magic number for validation */
  magic: number;
  
  /** PAK format version */
  version: PakVersion;
  
  /** Offset to the index */
  indexOffset: bigint;
  
  /** Size of the index */
  indexSize: bigint;
  
  /** Hash of the index */
  indexHash: Buffer;
  
  /** Whether the index is frozen */
  frozenIndex: boolean;
  
  /** Compression methods used */
  compressionMethods: CompressionMethod[];
}

/**
 * Individual file entry in the PAK index
 */
export interface IPakEntry {
  /** File path within the PAK */
  filename: string;
  
  /** Absolute offset in the PAK file */
  offset: bigint;
  
  /** Compressed size of the file */
  size: bigint;
  
  /** Uncompressed size of the file */
  uncompressedSize: bigint;
  
  /** Compression method used */
  compressionMethod: CompressionMethod;
  
  /** SHA1 hash of the file */
  hash: Buffer;
  
  /** Compression blocks (if any) */
  compressionBlocks: ICompressionBlock[];
  
  /** Whether the file is encrypted */
  encrypted: boolean;
  
  /** Size of the compressed blocks */
  compressionBlockSize: number;
}

/**
 * Compression block information
 */
export interface ICompressionBlock {
  /** Start offset (relative to file start) */
  compressedStart: bigint;
  
  /** End offset (relative to file start) */
  compressedEnd: bigint;
  
  /** Uncompressed start offset */
  uncompressedStart: bigint;
  
  /** Uncompressed end offset */
  uncompressedEnd: bigint;
}

/**
 * PAK file header constants
 */
export const PAK_CONSTANTS = {
  /** Size of the PAK info structure */
  INFO_SIZE: 44,
  
  /** Size of SHA1 hash */
  HASH_SIZE: 20,
  
  /** Size of GUID */
  GUID_SIZE: 16,
  
  /** Alignment for compression blocks */
  COMPRESSION_BLOCK_ALIGNMENT: 16,
  
  /** Default compression block size */
  DEFAULT_COMPRESSION_BLOCK_SIZE: 64 * 1024, // 64KB
} as const;