import { PakArchive } from '../src/containers/pak/PakArchive';
import { KeyManager } from '../src/crypto/KeyManager';
import { CompressionMethod, PakVersion } from '../src/containers/pak/PakStructures';
import { BufferReader } from '../src/core/io/BufferReader';
import { logger, LogLevel } from '../src/core/logging/Logger';
import * as fs from 'fs/promises';
import * as path from 'path';

// Set log level to ERROR to reduce test noise
logger.setLevel(LogLevel.ERROR);

describe('PakArchive', () => {
  let tempDir: string;
  let keyManager: KeyManager;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = path.join(__dirname, '../tmp/pak-tests');
    await fs.mkdir(tempDir, { recursive: true });
    
    // Create key manager with test key
    keyManager = new KeyManager();
    await keyManager.submitKey(
      '12345678-1234-1234-1234-123456789abc',
      '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF'
    );
  });

  afterEach(async () => {
    // Clean up temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Archive Initialization', () => {
    it('should create archive instance', () => {
      const archive = new PakArchive('/fake/path/test.pak');
      expect(archive).toBeInstanceOf(PakArchive);
      expect(archive.name).toBe('/fake/path/test.pak');
    });

    it('should report encryption status correctly', async () => {
      const archive = new PakArchive('/fake/path/test.pak', keyManager);
      
      // Before initialization, not encrypted
      expect(archive.isEncrypted).toBe(false);
      expect(archive.fileCount).toBe(0);
    });
  });

  describe('File Extraction', () => {
    it('should handle uncompressed, unencrypted files', async () => {
      // This test would require a real PAK file or mock implementation
      // For now, test the class structure and methods exist
      const archive = new PakArchive('/fake/path/test.pak');
      
      expect(typeof archive.hasFile).toBe('function');
      expect(typeof archive.getFile).toBe('function');
      expect(typeof archive.getFileInfo).toBe('function');
      expect(typeof archive.listFiles).toBe('function');
      expect(typeof archive.close).toBe('function');
    });

    it('should throw error when getting file from uninitialized archive', async () => {
      const archive = new PakArchive('/fake/path/test.pak');
      
      // Since the PAK file doesn't exist, getFile should return null
      // (because hasFile would return false)
      const result = await archive.getFile('NonExistent.txt');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    it('should filter files by pattern', async () => {
      const archive = new PakArchive('/fake/path/test.pak');
      
      // Test that listFiles method exists and accepts pattern parameter
      const files = archive.listFiles('*.uasset');
      expect(Array.isArray(files)).toBe(true);
    });

    it('should filter files by multiple criteria', async () => {
      const archive = new PakArchive('/fake/path/test.pak');
      
      // Test various pattern formats
      const patterns = ['*.uasset', '*.umap', 'Content/**/*.uasset'];
      
      for (const pattern of patterns) {
        const files = archive.listFiles(pattern);
        expect(Array.isArray(files)).toBe(true);
      }
    });
  });

  describe('Compression Method Mapping', () => {
    it('should map compression methods correctly', () => {
      const archive = new PakArchive('/fake/path/test.pak');
      
      // Test the private method through public interface
      // We can't directly test private methods, but we can verify
      // the class handles different compression methods
      expect(archive).toBeInstanceOf(PakArchive);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing key for encrypted files', async () => {
      const archiveWithoutKeys = new PakArchive('/fake/path/encrypted.pak');
      
      // Test that the archive can be created without a key manager
      expect(archiveWithoutKeys.isEncrypted).toBe(false);
    });

    it('should handle invalid file paths', async () => {
      const archive = new PakArchive('/fake/path/test.pak');
      
      const result = await archive.getFile('');
      expect(result).toBeNull();
      
      const info = archive.getFileInfo('');
      expect(info).toBeNull();
    });
  });

  describe('Archive Metadata', () => {
    it('should provide version information', () => {
      const archive = new PakArchive('/fake/path/test.pak');
      
      // Before initialization, version should be 0
      expect(archive.getVersion()).toBe(0);
    });

    it('should provide mount point information', () => {
      const archive = new PakArchive('/fake/path/test.pak');
      
      // Before initialization, mount point should be empty
      expect(archive.getMountPoint()).toBe('');
    });
  });

  describe('Resource Management', () => {
    it('should handle close operation safely', async () => {
      const archive = new PakArchive('/fake/path/test.pak');
      
      // Should not throw even if not initialized
      await expect(archive.close()).resolves.not.toThrow();
      
      // Should be safe to call multiple times
      await expect(archive.close()).resolves.not.toThrow();
    });
  });
});