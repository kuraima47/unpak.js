# unpak.js v2.0 - Modernized Unreal Engine Asset Reader

[![TypeScript](https://img.shields.io/badge/typescript-ES2022-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A modern, modular TypeScript library for reading Unreal Engine pak files and assets, inspired by CUE4Parse architecture.

## ⚠️ Development Status

This is **version 2.0.0-alpha.1** - a complete rewrite of unpak.js with a modern, modular architecture. The library is currently in active development with phased implementation.

### ✅ Phase 1 Complete: Core Foundation
- [x] Modern TypeScript (ES2022, strict mode)
- [x] Modular architecture with clean separation of concerns
- [x] Comprehensive error handling and structured logging
- [x] Multi-key cryptography system with caching
- [x] FName pool system for efficient string handling
- [x] Compression system with zlib support and plugin architecture
- [x] Core PAK file format parsing
- [x] Comprehensive test suite with 71+ tests

### 🚧 In Progress: PAK File Reading (Phase 2)
- [x] PAK header and index parsing (versions 1-9)
- [x] File entry extraction
- [x] Basic compression support (zlib)
- [ ] AES decryption implementation
- [ ] Compression block handling

### 📋 Roadmap
- **Phase 3**: Multi-key AES decryption
- **Phase 4**: IoStore support (.utoc/.ucas files)
- **Phase 5**: Advanced archive abstraction
- **Phase 6**: Asset property system
- **Phase 7**: AssetRegistry.bin support  
- **Phase 8**: .uplugin file parsing
- **Phase 9**: BulkData lazy loading
- **Phase 10**: Unified API and optimization

## 🚀 Quick Start

### Installation

```bash
npm install unpak.js@2.0.0-alpha.1
```

### Basic Usage

```typescript
import { createKeyManager, openPakArchive, LogLevel, logger } from 'unpak.js';

// Configure logging
logger.setLevel(LogLevel.INFO);

// Create key manager for encrypted PAKs
const keyManager = createKeyManager();
await keyManager.submitKey('your-pak-guid', '0x123456789ABCDEF...');

// Open PAK archive
const archive = await openPakArchive('./path/to/file.pak', keyManager);

// List files
const files = archive.listFiles('*.uasset');
console.log(`Found ${files.length} asset files`);

// Extract a file
const fileData = await archive.getFile('Engine/Content/BasicShapes/Cube.uasset');
if (fileData) {
    console.log(`Extracted file: ${fileData.length} bytes`);
}

// Clean up
await archive.close();
```

### Working with FNames

```typescript
import { FNamePool } from 'unpak.js';

const pool = new FNamePool();

// Add names to the pool
const nameIndex = pool.addString('MyAssetName');

// Create FName objects
const fname = pool.getFName('MyAssetName', 5); // Name with instance number
console.log(fname.toString()); // "MyAssetName_5"

// Load multiple names
pool.loadNames(['Name1', 'Name2', 'Name3']);
```

### Compression System

```typescript
import { compressionRegistry, COMPRESSION_METHODS } from 'unpak.js';

// Decompress data
const compressedData = Buffer.from('...'); // Your compressed data
const decompressed = await compressionRegistry.decompress(compressedData, COMPRESSION_METHODS.ZLIB);

// Check supported methods
console.log('Supported:', compressionRegistry.getSupportedMethods());
```

## 🏗️ Architecture

The library follows a modular architecture inspired by CUE4Parse:

```
src/
├── core/                    # Core interfaces and utilities
│   ├── io/                 # Binary reading interfaces
│   ├── logging/            # Structured logging
│   └── errors/             # Error hierarchy
├── crypto/                 # Encryption/decryption
├── assets/                 # Asset handling
│   └── names/              # FName system
├── containers/             # Archive formats
│   └── pak/                # PAK file support
├── utils/                  # Utilities
│   └── compression/        # Compression system
└── api/                    # High-level API
```

## 🔧 Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

### Linting

```bash
npm run lint       # Check code style
npm run lint:fix   # Fix auto-fixable issues
```

## 📊 Current Capabilities

### ✅ Supported Features
- **PAK Files**: Read header, index, and file entries
- **Compression**: Zlib/Gzip decompression, plugin system for Oodle
- **Encryption**: Multi-key AES infrastructure (decryption pending)
- **FNames**: Efficient string pooling system
- **Logging**: Configurable structured logging
- **Error Handling**: Comprehensive error hierarchy

### ⚠️ Known Limitations  
- **Encryption**: AES decryption not yet implemented
- **IoStore**: .utoc/.ucas support pending (Phase 4)
- **Assets**: Property parsing pending (Phase 6)
- **Oodle**: Requires external plugin
- **Performance**: Not yet optimized for very large files

## 🤝 Contributing

This library is in active development. Contributions are welcome, especially for:

- IoStore implementation
- Asset property parsing
- Performance optimizations
- Additional compression methods
- Documentation improvements

## 📜 Legal Notice

This library is a clean-room implementation inspired by CUE4Parse architecture but contains no proprietary code. It does not include:

- Oodle compression implementation (proprietary)
- Unreal Engine source code
- Game-specific assets or keys

All compression and encryption algorithms use standard, publicly available implementations.

## 📖 References

- [CUE4Parse](https://github.com/FabianFG/CUE4Parse) - C# Unreal Engine asset parser
- [FModel](https://fmodel.app/) - Unreal Engine asset explorer
- [Unreal Engine Documentation](https://docs.unrealengine.com/)

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

**Note**: This is alpha software. APIs may change between versions. Use in production environments is not recommended until v2.0.0 stable release.