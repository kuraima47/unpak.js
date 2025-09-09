# unpak.js v2.0 - Modernized Unreal Engine Asset Reader

[![TypeScript](https://img.shields.io/badge/typescript-ES2022-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A modern, modular TypeScript library for reading Unreal Engine pak files and assets, inspired by CUE4Parse architecture.

## ⚠️ Development Status

This is **version 2.0.0-alpha.1** - a complete rewrite of unpak.js with a modern, modular architecture inspired by **CUE4Parse** and **FModel**. The library has extensive functionality with 343 TypeScript files and 102 passing tests.

### ✅ Core Systems Complete
- [x] **PAK Files**: Complete support for UE4/UE5 PAK archives (v1-11)
- [x] **IoStore**: Full .utoc/.ucas container support
- [x] **Cryptography**: Multi-key AES decryption system with caching
- [x] **Compression**: Zlib/Gzip support + plugin architecture for Oodle
- [x] **Asset Types**: 32+ UE asset types (UTexture2D, UStaticMesh, USoundWave, etc.) ✅ EXPANDED
- [x] **Skeletal Assets**: USkeletalMesh, UAnimSequence, UPhysicsAsset ✅ NEW  
- [x] **Terrain**: ULandscape with heightmaps and layers ✅ NEW
- [x] **Particles**: UParticleSystem for Cascade effects ✅ NEW
- [x] **Enhanced Audio**: UWwiseAudioEngine with 3D spatial audio ✅ NEW
- [x] **Converters**: Texture, material, sound, and 3D mesh export systems ✅ ENHANCED
- [x] **Game Support**: Fortnite and Valorant specific modules
- [x] **3D Export**: OBJ and glTF mesh export with skeleton support ✅ NEW

### 🚧 Currently Expanding
- [x] **Asset Property System**: Core UObject properties with Blueprint support
- [x] **Registry Support**: AssetRegistry.bin parsing and metadata
- [x] **Advanced Assets**: Skeletal meshes, animations, particles, physics, terrain ✅ COMPLETE
- [x] **3D Mesh Export**: OBJ and glTF format support ✅ COMPLETE
- [x] **Enhanced Audio**: Complete Wwise system with 3D spatial audio ✅ COMPLETE  
- [ ] **Advanced Converters**: FBX export and animation sequences
- [ ] **Performance**: Optimization for very large files

### 📋 Comprehensive Roadmap

**[See ROADMAP.md](./ROADMAP.md)** for detailed development phases based on CUE4Parse and FModel capabilities:

- **Phase 3-4**: Enhanced asset coverage and property system expansion
- **Phase 5-6**: Game-specific support and advanced converters  
- **Phase 7-8**: Audio system enhancement and complete registry support
- **Phase 9-12**: Plugin support, performance optimization, and unified API

**Implementation Status**: ~60% complete with solid foundation for remaining features

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

### Working with Assets

```typescript
import { openPakArchive, createKeyManager } from 'unpak.js';

// Open PAK with encryption key
const keyManager = createKeyManager();
await keyManager.submitKey('your-pak-guid', '0x123456789ABCDEF...');
const archive = await openPakArchive('./FortniteGame/Content/Paks/pakchunk0-WindowsClient.pak', keyManager);

// Extract and convert texture
const textureData = await archive.getFile('Game/Characters/Player/Textures/Player_Diffuse.uasset');
if (textureData) {
    // Parse UTexture2D asset
    const texture = await parseAsset(textureData, 'UTexture2D');
    
    // Convert to PNG
    const pngData = await convertTexture(texture, 'PNG');
    await fs.writeFile('player_diffuse.png', pngData);
}

// Extract static mesh
const meshData = await archive.getFile('Game/Environment/Props/Crate.uasset');
if (meshData) {
    const mesh = await parseAsset(meshData, 'UStaticMesh');
    console.log(`Mesh has ${mesh.getNumTriangles()} triangles`);
}
```

### IoStore Support (UE5)

```typescript
import { openIoStoreArchive } from 'unpak.js';

// Open UE5 IoStore container
const archive = await openIoStoreArchive('./Game/Content/global', keyManager, 5);

// List all textures in container
const textures = archive.listFiles('*.uasset', 'Game/Textures/');
console.log(`Found ${textures.length} texture files`);

// Extract with compression handling
for (const file of textures) {
    const data = await archive.getFile(file.path);
    console.log(`${file.path}: ${data.length} bytes (compressed: ${file.isCompressed})`);
}
```

### Game-Specific Features

```typescript
import { FortniteAssetParser, ValObjectRegistry } from 'unpak.js';

// Fortnite-specific asset handling
const fortParser = new FortniteAssetParser();
const fortAsset = await fortParser.parseAsset(assetData);

// Valorant-specific exports
const valRegistry = new ValObjectRegistry();
const valExport = valRegistry.createExport(exportData);
```

## 🏗️ Architecture

The library follows a modular architecture inspired by **CUE4Parse** with 343+ TypeScript files:

```
src/
├── core/                    # Core interfaces and utilities  
│   ├── io/                 # Binary reading (IReader, BufferReader)
│   ├── logging/            # Structured logging system
│   └── errors/             # Comprehensive error hierarchy
├── crypto/                 # Multi-key encryption system
├── assets/names/           # FName pool for string efficiency  
├── containers/             # Archive format support
│   ├── pak/                # PAK file support (complete)
│   └── iostore/            # IoStore .utoc/.ucas support (complete)
├── ue4/                    # Unreal Engine 4/5 implementation
│   ├── assets/             # 25+ asset types and property system
│   ├── converters/         # Texture, material, sound converters
│   ├── objects/            # UE object hierarchy
│   ├── registry/           # AssetRegistry.bin support
│   └── versions/           # UE version compatibility
├── utils/compression/      # Plugin-based compression system
├── fort/                   # Fortnite-specific support
├── valorant/               # Valorant-specific support
├── api/                    # High-level API interfaces
└── index.ts               # Main library exports (62 exports)
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
- **Archive Formats**: PAK files (v1-11) and IoStore (.utoc/.ucas) with full UE4/UE5 support
- **Asset Types**: 25+ implemented including UTexture2D, UStaticMesh, USoundWave, UDataTable, ULevel, UBlueprintGeneratedClass
- **Compression**: Zlib/Gzip decompression, plugin system ready for Oodle
- **Encryption**: Complete multi-key AES decryption system
- **Converters**: Texture (PNG/TGA/DDS), material, and sound (WAV/OGG) export
- **Game Support**: Fortnite and Valorant specific asset handling
- **Audio**: Wwise integration with AkMediaAssetData support
- **Properties**: UObject property system with Blueprint and struct support
- **Registry**: AssetRegistry.bin parsing and asset metadata
- **Logging**: Configurable structured logging with context
- **Error Handling**: Comprehensive error hierarchy

### ⚠️ Known Limitations  
- [x] **3D Export**: Basic OBJ and glTF mesh export implemented ✅ COMPLETE
- [x] **Skeletal Meshes**: Rigged mesh support implemented ✅ COMPLETE
- [x] **Animation**: UAnimSequence parsing implemented ✅ COMPLETE
- [x] **Physics**: UPhysicsAsset collision and constraints ✅ COMPLETE
- [x] **Terrain**: ULandscape heightmaps and materials ✅ COMPLETE
- [x] **Particles**: UParticleSystem Cascade effects ✅ COMPLETE
- [x] **Advanced Audio**: Enhanced Wwise system with 3D audio ✅ COMPLETE
- [ ] **Advanced 3D Export**: FBX format with full animation support pending
- [ ] **Animation Export**: Complete animation export pipeline pending
- [ ] **Oodle**: Requires external plugin for proprietary compression
- [ ] **Performance**: Large file optimization pending (Phase 11)
- [ ] **UI Tools**: Asset browser and preview tools planned (Phase 12)

## 🤝 Contributing

This library is actively developed following the **CUE4Parse** architecture and **FModel** feature set. Contributions are welcome, especially for:

- **Asset Type Expansion**: Additional UE4/UE5 asset types and properties
- **Game-Specific Support**: New game modules (Rocket League, Fall Guys, etc.)
- **3D Export**: Mesh export to OBJ, FBX, glTF formats
- **Performance**: Large file handling and memory optimization
- **Audio Enhancement**: Complete Wwise and audio format support
- **Documentation**: API documentation and usage examples

See [ROADMAP.md](./ROADMAP.md) for detailed development phases and implementation priorities.

## 📜 Legal Notice

This library is a clean-room implementation inspired by CUE4Parse architecture but contains no proprietary code. It does not include:

- Oodle compression implementation (proprietary)
- Unreal Engine source code
- Game-specific assets or keys

All compression and encryption algorithms use standard, publicly available implementations.

## 📖 References

- **[CUE4Parse](https://github.com/FabianFG/CUE4Parse)** - C# Unreal Engine asset parser (primary architecture reference)
- **[FModel](https://fmodel.app/)** - Unreal Engine asset explorer (user experience reference)
- **[Development Reference Guide](./docs/CUE4PARSE_FMODEL_REFERENCE.md)** - Detailed mapping for contributors
- **[Comprehensive Roadmap](./ROADMAP.md)** - 12-phase development plan based on proven implementations
- [Unreal Engine Documentation](https://docs.unrealengine.com/) - Official UE4/UE5 documentation

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

**Note**: This is alpha software. APIs may change between versions. Use in production environments is not recommended until v2.0.0 stable release.