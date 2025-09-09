// Core interfaces and types
export * from './core/io/IReader';
export * from './core/io/IArchive';
export * from './core/io/BufferReader';
export * from './core/logging/Logger';
export * from './core/errors/UnpakErrors';

// Crypto system
export * from './crypto/ICrypto';
export * from './crypto/CryptoProvider';
export * from './crypto/KeyManager';

// Asset name system
export * from './assets/names/IFName';
export * from './assets/names/FNamePool';

// API layer
export * from './api/IUnpakAPI';

// Main library version and metadata
export const VERSION = '2.0.0-alpha.1';
export const SUPPORTED_FORMATS = ['pak', 'utoc', 'ucas'] as const;
export const SUPPORTED_UE_VERSIONS = ['UE4.26', 'UE4.27', 'UE5.0', 'UE5.1', 'UE5.2', 'UE5.3'] as const;

/**
 * Library feature flags
 */
export const FEATURES = {
  PAK_READING: true,
  IOSTORE_READING: false, // Phase 4
  MULTI_KEY_AES: true,
  ASSET_REGISTRY: false, // Phase 7
  UPLUGIN_PARSING: false, // Phase 8
  BULK_DATA_LAZY: false, // Phase 9
  OODLE_COMPRESSION: false, // Plugin system
} as const;

/**
 * Quick start helper - creates a basic key manager with memory provider
 */
export function createKeyManager(): import('./crypto/KeyManager').KeyManager {
  const { KeyManager, MemoryKeyProvider } = require('./crypto/KeyManager');
  const manager = new KeyManager();
  manager.addProvider(new MemoryKeyProvider());
  return manager;
}
