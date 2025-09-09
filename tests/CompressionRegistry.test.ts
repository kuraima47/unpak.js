import { CompressionRegistry, ZlibCompressor, OodleCompressor } from '../src/utils/compression/CompressionRegistry';
import { COMPRESSION_METHODS } from '../src/utils/compression/ICompression';
import { CompressionError } from '../src/core/errors/UnpakErrors';

describe('CompressionRegistry', () => {
  let registry: CompressionRegistry;

  beforeEach(() => {
    registry = new CompressionRegistry();
  });

  describe('initialization', () => {
    it('should register built-in compressors', () => {
      const supportedMethods = registry.getSupportedMethods();
      expect(supportedMethods).toContain(COMPRESSION_METHODS.ZLIB);
      expect(supportedMethods).toContain(COMPRESSION_METHODS.GZIP);
      expect(supportedMethods).toContain(COMPRESSION_METHODS.OODLE);
    });

    it('should find registered compressors', () => {
      const zlibCompressor = registry.getCompressor(COMPRESSION_METHODS.ZLIB);
      const oodleCompressor = registry.getCompressor(COMPRESSION_METHODS.OODLE);
      
      expect(zlibCompressor).not.toBeNull();
      expect(oodleCompressor).not.toBeNull();
      expect(zlibCompressor).toBeInstanceOf(ZlibCompressor);
      expect(oodleCompressor).toBeInstanceOf(OodleCompressor);
    });
  });

  describe('none compression', () => {
    it('should handle "none" compression by returning original data', async () => {
      const testData = Buffer.from('Hello, World!', 'utf8');
      const result = await registry.decompress(testData, COMPRESSION_METHODS.NONE);
      
      expect(Buffer.compare(result, testData)).toBe(0);
    });
  });

  describe('unknown compression', () => {
    it('should throw error for unknown compression method', async () => {
      const testData = Buffer.from('test');
      
      await expect(registry.decompress(testData, 'unknown'))
        .rejects.toThrow(CompressionError);
    });
  });

  describe('custom compressor registration', () => {
    it('should allow registering custom compressors', () => {
      const customCompressor = new ZlibCompressor(); // Using zlib as example
      registry.register(['custom'], customCompressor);
      
      const foundCompressor = registry.getCompressor('custom');
      expect(foundCompressor).toBe(customCompressor);
    });
  });
});

describe('ZlibCompressor', () => {
  let compressor: ZlibCompressor;

  beforeEach(() => {
    compressor = new ZlibCompressor();
  });

  describe('method support', () => {
    it('should support zlib and gzip methods', () => {
      expect(compressor.supports(COMPRESSION_METHODS.ZLIB)).toBe(true);
      expect(compressor.supports(COMPRESSION_METHODS.GZIP)).toBe(true);
      expect(compressor.supports(COMPRESSION_METHODS.OODLE)).toBe(false);
    });

    it('should return supported methods list', () => {
      const methods = compressor.getSupportedMethods();
      expect(methods).toContain(COMPRESSION_METHODS.ZLIB);
      expect(methods).toContain(COMPRESSION_METHODS.GZIP);
    });
  });

  describe('decompression', () => {
    it('should throw error for unsupported method', async () => {
      const testData = Buffer.from('test');
      
      await expect(compressor.decompress(testData, 'unsupported'))
        .rejects.toThrow(CompressionError);
    });

    it('should handle invalid zlib data gracefully', async () => {
      const invalidData = Buffer.from('not zlib data');
      
      await expect(compressor.decompress(invalidData, COMPRESSION_METHODS.ZLIB))
        .rejects.toThrow(CompressionError);
    });
  });
});

describe('OodleCompressor', () => {
  let compressor: OodleCompressor;

  beforeEach(() => {
    compressor = new OodleCompressor();
  });

  describe('method support', () => {
    it('should only support oodle method', () => {
      expect(compressor.supports(COMPRESSION_METHODS.OODLE)).toBe(true);
      expect(compressor.supports(COMPRESSION_METHODS.ZLIB)).toBe(false);
    });

    it('should return oodle in supported methods', () => {
      const methods = compressor.getSupportedMethods();
      expect(methods).toEqual([COMPRESSION_METHODS.OODLE]);
    });
  });

  describe('decompression', () => {
    it('should throw descriptive error for oodle decompression', async () => {
      const testData = Buffer.from('test');
      
      await expect(compressor.decompress(testData, COMPRESSION_METHODS.OODLE))
        .rejects.toThrow('Oodle compression is not supported');
    });
  });
});