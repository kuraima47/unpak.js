/**
 * Interface for compression/decompression operations
 */
export interface ICompressor {
  /**
   * Decompress data using the specified method
   */
  decompress(data: Buffer, method: string): Promise<Buffer>;
  
  /**
   * Check if a compression method is supported
   */
  supports(method: string): boolean;
  
  /**
   * Get list of supported compression methods
   */
  getSupportedMethods(): string[];
}

/**
 * Registry for compression providers
 */
export interface ICompressionRegistry {
  /**
   * Register a compressor for specific methods
   */
  register(methods: string[], compressor: ICompressor): void;
  
  /**
   * Get a compressor for the specified method
   */
  getCompressor(method: string): ICompressor | null;
  
  /**
   * Decompress data using the appropriate compressor
   */
  decompress(data: Buffer, method: string): Promise<Buffer>;
}

/**
 * Compression method constants
 */
export const COMPRESSION_METHODS = {
  NONE: 'none',
  ZLIB: 'zlib',
  GZIP: 'gzip',
  OODLE: 'oodle',
  CUSTOM: 'custom',
} as const;

export type CompressionMethodType = typeof COMPRESSION_METHODS[keyof typeof COMPRESSION_METHODS];