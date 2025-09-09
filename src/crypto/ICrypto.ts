/**
 * Interface for providing encryption keys asynchronously
 * Allows for dynamic key loading from various sources
 */
export interface IKeyProvider {
  /**
   * Get an AES key for the given GUID
   * @param guid The key identifier (usually archive GUID)
   * @returns Promise resolving to the key buffer, or null if not found
   */
  getKey(guid: string): Promise<Buffer | null>;
  
  /**
   * Check if a key is available for the given GUID
   * @param guid The key identifier
   * @returns Promise resolving to true if key is available
   */
  hasKey(guid: string): Promise<boolean>;
  
  /**
   * Add a key to the provider
   * @param guid The key identifier
   * @param key The key data (hex string or Buffer)
   */
  addKey(guid: string, key: string | Buffer): Promise<void>;
}

/**
 * Interface for encryption/decryption operations
 */
export interface ICryptoProvider {
  /**
   * Decrypt data using AES
   * @param data The encrypted data
   * @param key The decryption key
   * @param mode The AES mode (ECB, CTR, etc.)
   * @param iv Initialization vector (for modes that require it)
   * @returns Promise resolving to decrypted data
   */
  decryptAES(data: Buffer, key: Buffer, mode: AESMode, iv?: Buffer): Promise<Buffer>;
  
  /**
   * Test if a key is valid for the given encrypted data
   * @param data Sample encrypted data
   * @param key The key to test
   * @param mode The AES mode
   * @param iv Initialization vector
   * @returns Promise resolving to true if key is valid
   */
  testKey(data: Buffer, key: Buffer, mode: AESMode, iv?: Buffer): Promise<boolean>;
}

/**
 * Supported AES modes
 */
export enum AESMode {
  ECB = 'aes-256-ecb',
  CTR = 'aes-256-ctr',
  CBC = 'aes-256-cbc',
}

/**
 * Key manager that coordinates key providers and caching
 */
export interface IKeyManager {
  /**
   * Add a key provider to the manager
   */
  addProvider(provider: IKeyProvider): void;
  
  /**
   * Get a key for the given GUID, checking all providers
   */
  getKey(guid: string): Promise<Buffer | null>;
  
  /**
   * Submit a key directly to the manager
   */
  submitKey(guid: string, key: string | Buffer): Promise<void>;
  
  /**
   * Clear all cached keys
   */
  clearCache(): void;
}