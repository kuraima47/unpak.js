import { IKeyProvider, IKeyManager } from './ICrypto';
import { KeyUtils } from './CryptoProvider';
import { logger } from '../core/logging/Logger';

/**
 * Simple in-memory key provider
 */
export class MemoryKeyProvider implements IKeyProvider {
  private keys = new Map<string, Buffer>();

  async getKey(guid: string): Promise<Buffer | null> {
    return this.keys.get(guid.toLowerCase()) || null;
  }

  async hasKey(guid: string): Promise<boolean> {
    return this.keys.has(guid.toLowerCase());
  }

  async addKey(guid: string, key: string | Buffer): Promise<void> {
    const keyBuffer = KeyUtils.normalizeKey(key);
    
    if (!KeyUtils.validateKeyLength(keyBuffer)) {
      throw new Error(`Invalid key length: ${keyBuffer.length} bytes. Expected 16, 24, or 32 bytes.`);
    }
    
    this.keys.set(guid.toLowerCase(), keyBuffer);
    logger.debug('Added key to memory provider', { guid: guid.toLowerCase(), keyLength: keyBuffer.length });
  }

  /**
   * Get all stored key GUIDs
   */
  getStoredKeys(): string[] {
    return Array.from(this.keys.keys());
  }

  /**
   * Clear all stored keys
   */
  clear(): void {
    this.keys.clear();
  }
}

/**
 * Key manager implementation with caching and multiple providers
 */
export class KeyManager implements IKeyManager {
  private providers: IKeyProvider[] = [];
  private cache = new Map<string, Buffer | null>();

  addProvider(provider: IKeyProvider): void {
    this.providers.push(provider);
    logger.debug('Added key provider', { providerType: provider.constructor.name });
  }

  async getKey(guid: string): Promise<Buffer | null> {
    const normalizedGuid = guid.toLowerCase();
    
    // Check cache first
    if (this.cache.has(normalizedGuid)) {
      return this.cache.get(normalizedGuid) || null;
    }

    // Try each provider
    for (const provider of this.providers) {
      try {
        const key = await provider.getKey(normalizedGuid);
        if (key) {
          this.cache.set(normalizedGuid, key);
          logger.debug('Found key in provider', { 
            guid: normalizedGuid, 
            providerType: provider.constructor.name 
          });
          return key;
        }
      } catch (error) {
        logger.warn('Error getting key from provider', {
          guid: normalizedGuid,
          providerType: provider.constructor.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Cache miss result
    this.cache.set(normalizedGuid, null);
    logger.warn('Key not found in any provider', { guid: normalizedGuid });
    return null;
  }

  async submitKey(guid: string, key: string | Buffer): Promise<void> {
    const normalizedGuid = guid.toLowerCase();
    const keyBuffer = KeyUtils.normalizeKey(key);
    
    // Add to the first provider (create memory provider if none exist)
    if (this.providers.length === 0) {
      this.addProvider(new MemoryKeyProvider());
    }

    await this.providers[0].addKey(normalizedGuid, keyBuffer);
    
    // Update cache
    this.cache.set(normalizedGuid, keyBuffer);
    
    logger.info('Submitted key', { guid: normalizedGuid, keyLength: keyBuffer.length });
  }

  clearCache(): void {
    this.cache.clear();
    logger.debug('Cleared key cache');
  }

  /**
   * Get statistics about cached keys
   */
  getStats(): { cachedKeys: number; providers: number } {
    return {
      cachedKeys: this.cache.size,
      providers: this.providers.length
    };
  }
}