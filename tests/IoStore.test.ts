import { IoStoreArchive } from '../src/containers/iostore/IoStoreArchive';
import { IoStoreParser, IoChunkId } from '../src/containers/iostore/IoStoreParser';
import { IoStoreTocVersion, IoContainerFlags, IOSTORE_CONSTANTS } from '../src/containers/iostore/IoStoreStructures';
import { KeyManager } from '../src/crypto/KeyManager';
import { BufferReader } from '../src/core/io/BufferReader';
import { logger, LogLevel } from '../src/core/logging/Logger';
import * as fs from 'fs/promises';
import * as path from 'path';

// Set log level to ERROR to reduce test noise
logger.setLevel(LogLevel.ERROR);

describe('IoStore', () => {
  let tempDir: string;
  let keyManager: KeyManager;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = path.join(__dirname, '../tmp/iostore-tests');
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

  describe('IoChunkId', () => {
    it('should create and manipulate chunk IDs', () => {
      const chunkId = new IoChunkId();
      expect(chunkId.id).toBeInstanceOf(Buffer);
      expect(chunkId.id.length).toBe(12);
      
      // Test string representation
      expect(typeof chunkId.toString()).toBe('string');
      expect(chunkId.toString().length).toBe(24); // 12 bytes * 2 hex chars
    });

    it('should handle chunk type and index', () => {
      const reader = new BufferReader(Buffer.alloc(12));
      const chunkId = new IoChunkId(reader);
      
      expect(typeof chunkId.chunkType).toBe('number');
      expect(typeof chunkId.chunkIndex).toBe('number');
    });

    it('should compare chunk IDs', () => {
      const chunkId1 = new IoChunkId();
      const chunkId2 = new IoChunkId();
      
      // Fill with different data
      chunkId1.id.fill(0xAA);
      chunkId2.id.fill(0xBB);
      
      // Should be different
      expect(chunkId1.equals(chunkId2)).toBe(false);
      
      // Make them equal
      chunkId2.id = Buffer.from(chunkId1.id);
      expect(chunkId1.equals(chunkId2)).toBe(true);
    });

    it('should compute hash with seed', () => {
      const chunkId = new IoChunkId();
      const hash1 = chunkId.hashWithSeed(0);
      const hash2 = chunkId.hashWithSeed(1234);
      
      expect(typeof hash1).toBe('bigint');
      expect(typeof hash2).toBe('bigint');
      expect(hash1).not.toBe(hash2); // Different seeds should produce different hashes
    });
  });

  describe('IoStoreParser', () => {
    it('should handle invalid TOC magic', () => {
      const invalidBuffer = Buffer.alloc(200);
      invalidBuffer.write('invalid magic', 0);
      
      expect(() => {
        IoStoreParser.parseToc(invalidBuffer);
      }).toThrow('Invalid IoStore TOC magic');
    });

    it('should create minimal valid TOC structure', () => {
      // Create a minimal mock TOC buffer
      const buffer = Buffer.alloc(200);
      let offset = 0;
      
      // Write TOC magic
      buffer.write(IOSTORE_CONSTANTS.TOC_MAGIC, offset);
      offset += 16;
      
      // Write version
      buffer.writeUInt8(IoStoreTocVersion.Latest, offset++);
      
      // Write reserved fields
      buffer.writeUInt8(0, offset++); // reserved0
      buffer.writeUInt16LE(0, offset); offset += 2; // reserved1
      
      // Write header size
      buffer.writeUInt32LE(IOSTORE_CONSTANTS.TOC_HEADER_SIZE, offset); offset += 4;
      
      // Write entry counts (all zeros for minimal test)
      buffer.writeUInt32LE(0, offset); offset += 4; // tocEntryCount
      buffer.writeUInt32LE(0, offset); offset += 4; // tocCompressedBlockEntryCount
      
      // Write compressed block entry size
      buffer.writeUInt32LE(IOSTORE_CONSTANTS.COMPRESSED_BLOCK_ENTRY_SIZE, offset); offset += 4;
      
      // Fill rest with zeros (this is a minimal test)
      
      // This should not throw but will parse successfully
      expect(() => {
        IoStoreParser.parseToc(buffer);
      }).not.toThrow();
    });
  });

  describe('IoStoreArchive', () => {
    it('should create archive instance', () => {
      const archive = new IoStoreArchive('/fake/path/test');
      expect(archive).toBeInstanceOf(IoStoreArchive);
      expect(archive.name).toBe('/fake/path/test');
    });

    it('should report initial state correctly', () => {
      const archive = new IoStoreArchive('/fake/path/test', keyManager);
      
      // Before initialization
      expect(archive.isEncrypted).toBe(false);
      expect(archive.fileCount).toBe(0);
      expect(archive.getVersion()).toBe(0);
      expect(archive.getMountPoint()).toBe('');
    });

    it('should handle UE version configuration', () => {
      const ue4Archive = new IoStoreArchive('/fake/path/test', keyManager, 4);
      const ue5Archive = new IoStoreArchive('/fake/path/test', keyManager, 5);
      
      expect(ue4Archive).toBeInstanceOf(IoStoreArchive);
      expect(ue5Archive).toBeInstanceOf(IoStoreArchive);
    });

    it('should handle file operations on uninitialized archive', async () => {
      const archive = new IoStoreArchive('/fake/path/test');
      
      expect(archive.hasFile('test.uasset')).toBe(false);
      
      const file = await archive.getFile('test.uasset');
      expect(file).toBeNull();
      
      const info = archive.getFileInfo('test.uasset');
      expect(info).toBeNull();
      
      const files = archive.listFiles();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });

    it('should handle pattern matching', () => {
      const archive = new IoStoreArchive('/fake/path/test');
      
      // Test pattern matching methods exist
      const files = archive.listFiles('*.uasset');
      expect(Array.isArray(files)).toBe(true);
      
      const files2 = archive.listFiles('Content/**/*.umap');
      expect(Array.isArray(files2)).toBe(true);
    });

    it('should handle close operation safely', async () => {
      const archive = new IoStoreArchive('/fake/path/test');
      
      // Should not throw even if not initialized
      await expect(archive.close()).resolves.not.toThrow();
      
      // Should be safe to call multiple times
      await expect(archive.close()).resolves.not.toThrow();
    });
  });

  describe('IoStore Constants', () => {
    it('should have valid constants', () => {
      expect(IOSTORE_CONSTANTS.TOC_MAGIC).toBe('-==--==--==--==-');
      expect(IOSTORE_CONSTANTS.TOC_HEADER_SIZE).toBe(144);
      expect(IOSTORE_CONSTANTS.COMPRESSED_BLOCK_ENTRY_SIZE).toBe(12);
      expect(IOSTORE_CONSTANTS.AES_BLOCK_SIZE).toBe(16);
    });
  });

  describe('IoStore Enums', () => {
    it('should have valid TOC versions', () => {
      expect(IoStoreTocVersion.Invalid).toBe(0);
      expect(IoStoreTocVersion.Initial).toBe(1);
      expect(IoStoreTocVersion.Latest).toBeGreaterThan(0);
    });

    it('should have valid container flags', () => {
      expect(IoContainerFlags.None).toBe(0);
      expect(IoContainerFlags.Compressed).toBe(1);
      expect(IoContainerFlags.Encrypted).toBe(2);
      expect(IoContainerFlags.Signed).toBe(4);
      expect(IoContainerFlags.Indexed).toBe(8);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing key for encrypted containers', async () => {
      const archiveWithoutKeys = new IoStoreArchive('/fake/path/encrypted');
      
      // Should create without throwing
      expect(archiveWithoutKeys.isEncrypted).toBe(false);
    });

    it('should handle invalid paths gracefully', async () => {
      const archive = new IoStoreArchive('/fake/path/test');
      
      const result = await archive.getFile('');
      expect(result).toBeNull();
      
      const info = archive.getFileInfo('');
      expect(info).toBeNull();
      
      expect(archive.hasFile('')).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should work with key manager integration', async () => {
      const archive = new IoStoreArchive('/fake/path/test', keyManager);
      
      // Should not throw when created with valid key manager
      expect(archive).toBeInstanceOf(IoStoreArchive);
    });

    it('should handle both UE4 and UE5 chunk types', () => {
      // This is more of a smoke test since we don't have real data
      const ue4Archive = new IoStoreArchive('/fake/path/test', keyManager, 4);
      const ue5Archive = new IoStoreArchive('/fake/path/test', keyManager, 5);
      
      expect(ue4Archive).toBeInstanceOf(IoStoreArchive);
      expect(ue5Archive).toBeInstanceOf(IoStoreArchive);
    });
  });
});