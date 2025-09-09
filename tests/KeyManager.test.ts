import { KeyManager, MemoryKeyProvider } from '../src/crypto/KeyManager';
import { KeyUtils } from '../src/crypto/CryptoProvider';

describe('KeyManager', () => {
  let keyManager: KeyManager;
  let memoryProvider: MemoryKeyProvider;

  beforeEach(() => {
    keyManager = new KeyManager();
    memoryProvider = new MemoryKeyProvider();
    keyManager.addProvider(memoryProvider);
  });

  describe('key submission and retrieval', () => {
    it('should submit and retrieve hex keys correctly', async () => {
      const testGuid = '12345678-1234-1234-1234-123456789ABC';
      const testKey = '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';
      
      await keyManager.submitKey(testGuid, testKey);
      const retrieved = await keyManager.getKey(testGuid);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.length).toBe(32); // 256-bit key
    });

    it('should submit and retrieve buffer keys correctly', async () => {
      const testGuid = '12345678-1234-1234-1234-123456789ABC';
      const testKey = Buffer.from('0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF', 'hex');
      
      await keyManager.submitKey(testGuid, testKey);
      const retrieved = await keyManager.getKey(testGuid);
      
      expect(retrieved).not.toBeNull();
      expect(Buffer.compare(retrieved!, testKey)).toBe(0);
    });

    it('should handle case-insensitive GUIDs', async () => {
      const lowerGuid = '12345678-1234-1234-1234-123456789abc';
      const upperGuid = '12345678-1234-1234-1234-123456789ABC';
      const mixedGuid = '12345678-1234-1234-1234-123456789AbC';
      const testKey = '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';
      
      await keyManager.submitKey(lowerGuid, testKey);
      
      const retrieved1 = await keyManager.getKey(upperGuid);
      const retrieved2 = await keyManager.getKey(mixedGuid);
      
      expect(retrieved1).not.toBeNull();
      expect(retrieved2).not.toBeNull();
    });
  });

  describe('caching behavior', () => {
    it('should cache successful lookups', async () => {
      const testGuid = '12345678-1234-1234-1234-123456789ABC';
      const testKey = '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';
      
      await keyManager.submitKey(testGuid, testKey);
      
      // First call should hit provider
      const result1 = await keyManager.getKey(testGuid);
      // Second call should hit cache
      const result2 = await keyManager.getKey(testGuid);
      
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(Buffer.compare(result1!, result2!)).toBe(0);
    });

    it('should cache negative lookups', async () => {
      const nonExistentGuid = 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF';
      
      const result1 = await keyManager.getKey(nonExistentGuid);
      const result2 = await keyManager.getKey(nonExistentGuid);
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should clear cache correctly', async () => {
      const testGuid = '12345678-1234-1234-1234-123456789ABC';
      const testKey = '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';
      
      await keyManager.submitKey(testGuid, testKey);
      await keyManager.getKey(testGuid); // Cache the result
      
      keyManager.clearCache();
      
      // Should still work (provider still has the key)
      const result = await keyManager.getKey(testGuid);
      expect(result).not.toBeNull();
    });
  });

  describe('multiple providers', () => {
    it('should check all providers in order', async () => {
      const provider2 = new MemoryKeyProvider();
      keyManager.addProvider(provider2);
      
      const testGuid = '12345678-1234-1234-1234-123456789ABC';
      const testKey = '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';
      
      // Add key to second provider only
      await provider2.addKey(testGuid, testKey);
      
      const result = await keyManager.getKey(testGuid);
      expect(result).not.toBeNull();
    });
  });

  describe('statistics', () => {
    it('should provide accurate stats', () => {
      const stats = keyManager.getStats();
      expect(stats.providers).toBe(1);
      expect(stats.cachedKeys).toBe(0);
    });

    it('should update stats after operations', async () => {
      const testGuid = '12345678-1234-1234-1234-123456789ABC';
      const testKey = '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';
      
      await keyManager.submitKey(testGuid, testKey);
      await keyManager.getKey(testGuid);
      
      const stats = keyManager.getStats();
      expect(stats.cachedKeys).toBe(1);
    });
  });
});

describe('MemoryKeyProvider', () => {
  let provider: MemoryKeyProvider;

  beforeEach(() => {
    provider = new MemoryKeyProvider();
  });

  describe('key management', () => {
    it('should store and retrieve keys correctly', async () => {
      const testGuid = '12345678-1234-1234-1234-123456789ABC';
      const testKey = '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';
      
      await provider.addKey(testGuid, testKey);
      
      const hasKey = await provider.hasKey(testGuid);
      const retrievedKey = await provider.getKey(testGuid);
      
      expect(hasKey).toBe(true);
      expect(retrievedKey).not.toBeNull();
      expect(retrievedKey!.length).toBe(32);
    });

    it('should validate key lengths', async () => {
      const testGuid = '12345678-1234-1234-1234-123456789ABC';
      const invalidKey = '0x123'; // Too short
      
      await expect(provider.addKey(testGuid, invalidKey))
        .rejects.toThrow('Invalid key format');
    });

    it('should list stored keys', async () => {
      const guid1 = '12345678-1234-1234-1234-123456789ABC';
      const guid2 = 'ABCDEF12-3456-7890-ABCD-EF1234567890';
      const testKey = '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';
      
      await provider.addKey(guid1, testKey);
      await provider.addKey(guid2, testKey);
      
      const storedKeys = provider.getStoredKeys();
      expect(storedKeys).toContain(guid1.toLowerCase());
      expect(storedKeys).toContain(guid2.toLowerCase());
      expect(storedKeys.length).toBe(2);
    });

    it('should clear all keys', async () => {
      const testGuid = '12345678-1234-1234-1234-123456789ABC';
      const testKey = '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';
      
      await provider.addKey(testGuid, testKey);
      expect(provider.getStoredKeys().length).toBe(1);
      
      provider.clear();
      expect(provider.getStoredKeys().length).toBe(0);
    });
  });
});

describe('KeyUtils', () => {
  describe('hex conversion', () => {
    it('should convert hex string to buffer', () => {
      const hex = '0x0123456789ABCDEF';
      const buffer = KeyUtils.hexToBuffer(hex);
      expect(buffer.toString('hex').toUpperCase()).toBe('0123456789ABCDEF');
    });

    it('should convert hex string without 0x prefix', () => {
      const hex = '0123456789ABCDEF';
      const buffer = KeyUtils.hexToBuffer(hex);
      expect(buffer.toString('hex').toUpperCase()).toBe('0123456789ABCDEF');
    });

    it('should convert buffer to hex string', () => {
      const buffer = Buffer.from('0123456789ABCDEF', 'hex');
      const hex = KeyUtils.bufferToHex(buffer);
      expect(hex).toBe('0x0123456789ABCDEF');
    });

    it('should handle invalid hex strings', () => {
      expect(() => KeyUtils.hexToBuffer('0x123'))  // Odd length
        .toThrow('Invalid hex string length');
    });
  });

  describe('key validation', () => {
    it('should validate correct key lengths', () => {
      expect(KeyUtils.validateKeyLength(Buffer.alloc(16))).toBe(true); // 128-bit
      expect(KeyUtils.validateKeyLength(Buffer.alloc(24))).toBe(true); // 192-bit
      expect(KeyUtils.validateKeyLength(Buffer.alloc(32))).toBe(true); // 256-bit
    });

    it('should reject invalid key lengths', () => {
      expect(KeyUtils.validateKeyLength(Buffer.alloc(15))).toBe(false);
      expect(KeyUtils.validateKeyLength(Buffer.alloc(33))).toBe(false);
    });
  });

  describe('key normalization', () => {
    it('should normalize hex string to buffer', () => {
      const hex = '0x0123456789ABCDEF0123456789ABCDEF';
      const normalized = KeyUtils.normalizeKey(hex);
      expect(Buffer.isBuffer(normalized)).toBe(true);
      expect(normalized.length).toBe(16);
    });

    it('should pass through buffer unchanged', () => {
      const buffer = Buffer.alloc(32);
      const normalized = KeyUtils.normalizeKey(buffer);
      expect(normalized).toBe(buffer); // Same reference
    });
  });
});