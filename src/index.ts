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

// Compression system
export * from './utils/compression/ICompression';
export * from './utils/compression/CompressionRegistry';

// PAK container support
export * from './containers/pak/PakStructures';
export * from './containers/pak/PakParser';
export * from './containers/pak/PakArchive';

// IoStore container support
export * from './containers/iostore/IoStoreStructures';
export * from './containers/iostore/IoStoreParser';
export * from './containers/iostore/IoStoreArchive';

// API layer
export * from './api/IUnpakAPI';

// Enhanced asset types (Phase 4 continuation)
export * from './ue4/assets/exports/UMediaSource';
export * from './ue4/assets/exports/mats/UDecalMaterial';

// Enhanced texture formats (Phase 6 continuation)
export * from './ue4/converters/textures/EnhancedFormats';

// NEW ROADMAP IMPLEMENTATIONS (Phase 6, 11, 12)
// FBX Export and Enhanced Converters (Phase 6)
export * from './ue4/converters/FBXConverter';

// Performance Optimization Tools (Phase 11)
export * from './ue4/performance/IncrementalParser';
export * from './ue4/performance/AssetParsingBenchmark';

// Enterprise API Features (Phase 12)
export * from './api/server/RestServer';
export * from './api/monitoring/AssetMonitor';

// Plugin support (Phase 9 start)
export * from './ue4/assets/plugins/UPlugin';

// Enhanced asset registry (Phase 8 continuation)
export * from './ue4/registry/EnhancedAssetRegistry';

// Main library version and metadata
export const VERSION = '2.0.0-alpha.1';
export const SUPPORTED_FORMATS = ['pak', 'utoc', 'ucas'] as const;
export const SUPPORTED_UE_VERSIONS = ['UE4.26', 'UE4.27', 'UE5.0', 'UE5.1', 'UE5.2', 'UE5.3'] as const;

/**
 * Library feature flags
 */
export const FEATURES = {
  PAK_READING: true,
  IOSTORE_READING: true, // Phase 2 - COMPLETE
  MULTI_KEY_AES: true, // Phase 2 - COMPLETE
  ASSET_REGISTRY: true, // Phase 8 - NOW ENHANCED ✅
  UPLUGIN_PARSING: true, // Phase 9 - NOW ADDED ✅
  ENHANCED_TEXTURE_FORMATS: true, // Phase 6 - NOW ENHANCED ✅
  MEDIA_ASSETS: true, // Phase 4 - NOW ADDED ✅
  DECAL_MATERIALS: true, // Phase 4 - NOW ADDED ✅
  
  // NEW ROADMAP FEATURES IMPLEMENTED ✅
  FBX_EXPORT: true, // Phase 6 - NEW: Complete FBX export with animations ✅
  INCREMENTAL_PARSING: true, // Phase 11 - NEW: Large file processing ✅
  ASSET_BENCHMARKING: true, // Phase 11 - NEW: Performance profiling ✅
  REST_API_SERVER: true, // Phase 12 - NEW: Web service interface ✅
  REAL_TIME_MONITORING: true, // Phase 12 - NEW: Asset change monitoring ✅
  
  // Future features
  BULK_DATA_LAZY: false, // Phase 10 - Future
  OODLE_COMPRESSION: false, // Plugin system
  ZLIB_COMPRESSION: true,
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

/**
 * Quick start helper - open a PAK archive
 */
export async function openPakArchive(filePath: string, keyManager?: import('./crypto/ICrypto').IKeyManager): Promise<import('./containers/pak/PakArchive').PakArchive> {
  const { PakArchive } = require('./containers/pak/PakArchive');
  const archive = new PakArchive(filePath, keyManager);
  await archive.initialize();
  return archive;
}

/**
 * Quick start helper - open an IoStore archive
 */
export async function openIoStoreArchive(containerPath: string, keyManager?: import('./crypto/ICrypto').IKeyManager, ueVersion?: number): Promise<import('./containers/iostore/IoStoreArchive').IoStoreArchive> {
  const { IoStoreArchive } = require('./containers/iostore/IoStoreArchive');
  const archive = new IoStoreArchive(containerPath, keyManager, ueVersion);
  await archive.initialize();
  return archive;
}
