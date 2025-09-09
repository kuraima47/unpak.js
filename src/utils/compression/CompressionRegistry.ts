import { inflateRaw, inflate } from 'zlib';
import { promisify } from 'util';
import { ICompressor, ICompressionRegistry, COMPRESSION_METHODS } from './ICompression';
import { CompressionError } from '../../core/errors/UnpakErrors';
import { logger } from '../../core/logging/Logger';

const inflateRawAsync = promisify(inflateRaw);
const inflateAsync = promisify(inflate);

/**
 * Zlib compressor implementation using Node.js built-in zlib
 */
export class ZlibCompressor implements ICompressor {
  async decompress(data: Buffer, method: string): Promise<Buffer> {
    try {
      switch (method.toLowerCase()) {
        case COMPRESSION_METHODS.ZLIB:
          return await inflateRawAsync(data);
        
        case COMPRESSION_METHODS.GZIP:
          return await inflateAsync(data);
        
        default:
          throw new CompressionError(`Unsupported compression method: ${method}`, method);
      }
    } catch (error) {
      throw new CompressionError(
        `Zlib decompression failed: ${error instanceof Error ? error.message : String(error)}`,
        method
      );
    }
  }
  
  supports(method: string): boolean {
    const normalizedMethod = method.toLowerCase();
    return normalizedMethod === COMPRESSION_METHODS.ZLIB || normalizedMethod === COMPRESSION_METHODS.GZIP;
  }
  
  getSupportedMethods(): string[] {
    return [COMPRESSION_METHODS.ZLIB, COMPRESSION_METHODS.GZIP];
  }
}

/**
 * Oodle compressor stub - provides clear error messages
 */
export class OodleCompressor implements ICompressor {
  async decompress(data: Buffer, method: string): Promise<Buffer> {
    throw new CompressionError(
      'Oodle compression is not supported. Please provide an Oodle plugin or use a different compression method.',
      method
    );
  }
  
  supports(method: string): boolean {
    return method.toLowerCase() === COMPRESSION_METHODS.OODLE;
  }
  
  getSupportedMethods(): string[] {
    return [COMPRESSION_METHODS.OODLE];
  }
}

/**
 * Registry for managing multiple compression providers
 */
export class CompressionRegistry implements ICompressionRegistry {
  private compressors = new Map<string, ICompressor>();
  
  constructor() {
    // Register built-in compressors
    this.register([COMPRESSION_METHODS.ZLIB, COMPRESSION_METHODS.GZIP], new ZlibCompressor());
    this.register([COMPRESSION_METHODS.OODLE], new OodleCompressor());
  }
  
  register(methods: string[], compressor: ICompressor): void {
    for (const method of methods) {
      this.compressors.set(method.toLowerCase(), compressor);
      logger.debug('Registered compressor', { 
        method: method.toLowerCase(), 
        compressorType: compressor.constructor.name 
      });
    }
  }
  
  getCompressor(method: string): ICompressor | null {
    return this.compressors.get(method.toLowerCase()) || null;
  }
  
  async decompress(data: Buffer, method: string): Promise<Buffer> {
    const normalizedMethod = method.toLowerCase();
    
    // Handle "none" compression
    if (normalizedMethod === COMPRESSION_METHODS.NONE) {
      return data;
    }
    
    const compressor = this.getCompressor(normalizedMethod);
    if (!compressor) {
      throw new CompressionError(`No compressor found for method: ${method}`, method);
    }
    
    logger.debug('Decompressing data', { 
      method: normalizedMethod,
      inputSize: data.length,
      compressorType: compressor.constructor.name
    });
    
    const result = await compressor.decompress(data, normalizedMethod);
    
    logger.debug('Decompression complete', {
      method: normalizedMethod,
      inputSize: data.length,
      outputSize: result.length,
      compressionRatio: (data.length / result.length).toFixed(2)
    });
    
    return result;
  }
  
  /**
   * Get all supported compression methods
   */
  getSupportedMethods(): string[] {
    const methods = new Set<string>();
    for (const compressor of this.compressors.values()) {
      for (const method of compressor.getSupportedMethods()) {
        methods.add(method);
      }
    }
    return Array.from(methods);
  }
}

// Global compression registry instance
export const compressionRegistry = new CompressionRegistry();