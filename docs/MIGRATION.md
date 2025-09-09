# Guide de Migration unpak.js v1.x → v2.0

## Vue d'Ensemble de la Migration

La version 2.0 d'unpak.js représente une refonte complète inspirée par **CUE4Parse** et **FModel**. Ce guide détaille les changements et fournit un chemin de migration clair.

## 🚨 Changements Majeurs (Breaking Changes)

### 1. Architecture Modulaire
```typescript
// ❌ v1.x - Monolithic approach
import PakFile from 'unpak';

// ✅ v2.x - Modular architecture
import { openPakArchive, createKeyManager, parseAsset } from 'unpak.js';
```

### 2. API Asynchrone
```typescript
// ❌ v1.x - Synchronous/callback-based
const pak = new PakFile('./game.pak');
pak.setKey('encryption-key');
pak.extract('file.uasset', (err, data) => {
    if (err) throw err;
    console.log(data);
});

// ✅ v2.x - Promise-based
const keyManager = createKeyManager();
await keyManager.submitKey('pak-guid', 'encryption-key');
const archive = await openPakArchive('./game.pak', keyManager);
const data = await archive.getFile('file.uasset');
console.log(data);
```

### 3. Gestion des Clés de Chiffrement
```typescript
// ❌ v1.x - Simple string key
pak.setKey('my-encryption-key');

// ✅ v2.x - GUID-based key management
const keyManager = createKeyManager();
await keyManager.submitKey('12345678-1234-1234-1234-123456789ABC', '0x123456789ABCDEF...');
```

### 4. Parsing d'Assets
```typescript
// ❌ v1.x - Basic extraction only
const data = pak.extract('texture.uasset');
// Manual parsing required

// ✅ v2.x - Automatic asset parsing
const textureData = await archive.getFile('texture.uasset');
const texture = await parseAsset(textureData, 'UTexture2D');
const pngData = await convertTexture(texture, 'PNG');
```

## 📦 Installation et Setup

### Désinstallation v1.x
```bash
npm uninstall unpak
```

### Installation v2.x
```bash
npm install unpak.js@2.0.0-alpha.1
```

### Nouvelles Dépendances
```json
{
  "dependencies": {
    "@discordjs/collection": "^2.1.1",
    "aes-js": "^3.1.2",
    "long": "^5.2.3",
    "reflect-metadata": "^0.2.2"
  }
}
```

## 🔄 Exemples de Migration

### Extraction Simple de Fichiers

#### v1.x
```javascript
const PakFile = require('unpak');

const pak = new PakFile('./FortniteGame/Content/Paks/pakchunk0-WindowsClient.pak');
pak.setKey('my-encryption-key');

// List files
const files = pak.listFiles();
console.log(`Found ${files.length} files`);

// Extract file
pak.extract('Engine/Content/BasicShapes/Cube.uasset', (err, data) => {
    if (err) {
        console.error('Extraction failed:', err);
        return;
    }
    console.log(`Extracted ${data.length} bytes`);
});
```

#### v2.x
```typescript
import { openPakArchive, createKeyManager, LogLevel, logger } from 'unpak.js';

// Configure logging
logger.setLevel(LogLevel.INFO);

async function extractFiles() {
    try {
        // Create key manager
        const keyManager = createKeyManager();
        await keyManager.submitKey('fortnite-main-key', '0x123456789ABCDEF...');

        // Open archive
        const archive = await openPakArchive('./FortniteGame/Content/Paks/pakchunk0-WindowsClient.pak', keyManager);

        // List files
        const files = archive.listFiles();
        console.log(`Found ${files.length} files`);

        // Extract file
        const data = await archive.getFile('Engine/Content/BasicShapes/Cube.uasset');
        console.log(`Extracted ${data.length} bytes`);

        // Clean up
        await archive.close();
    } catch (error) {
        console.error('Extraction failed:', error);
    }
}

extractFiles();
```

### Extraction avec Filtrage

#### v1.x
```javascript
// Basic pattern matching
const textureFiles = pak.listFiles().filter(file => 
    file.endsWith('.uasset') && file.includes('/Textures/')
);

for (const file of textureFiles) {
    pak.extract(file, (err, data) => {
        if (!err) {
            fs.writeFileSync(`./extracted/${path.basename(file)}`, data);
        }
    });
}
```

#### v2.x
```typescript
import { promises as fs } from 'fs';
import path from 'path';

// Advanced pattern matching and async processing
const textureFiles = archive.listFiles('*.uasset', 'Game/Textures/');
const outputDir = './extracted_textures';
await fs.mkdir(outputDir, { recursive: true });

// Parallel extraction with error handling
const results = await Promise.allSettled(
    textureFiles.map(async (file) => {
        const data = await archive.getFile(file.path);
        const outputPath = path.join(outputDir, path.basename(file.path));
        await fs.writeFile(outputPath, data);
        return { path: file.path, size: data.length };
    })
);

const successful = results.filter(r => r.status === 'fulfilled').length;
console.log(`Extracted ${successful}/${textureFiles.length} texture files`);
```

### Asset Parsing et Conversion

#### v1.x (Non supporté)
```javascript
// v1.x didn't support asset parsing
const data = pak.extract('texture.uasset');
// Manual binary parsing required...
```

#### v2.x
```typescript
// Automatic asset parsing and conversion
const textureData = await archive.getFile('Game/Characters/Player/Textures/Player_Diffuse.uasset');
const texture = await parseAsset(textureData, 'UTexture2D');

// Asset properties
console.log(`Texture: ${texture.sizeX}x${texture.sizeY}`);
console.log(`Format: ${texture.pixelFormat}`);
console.log(`Mips: ${texture.numMips}`);

// Convert to multiple formats
const pngData = await convertTexture(texture, 'PNG');
const tgaData = await convertTexture(texture, 'TGA');
const ddsData = await convertTexture(texture, 'DDS');

await fs.writeFile('player_diffuse.png', pngData);
await fs.writeFile('player_diffuse.tga', tgaData);
await fs.writeFile('player_diffuse.dds', ddsData);
```

## 🎮 Support Spécifique aux Jeux

### v1.x → v2.x Game Support

#### v1.x (Générique seulement)
```javascript
// Generic PAK support only
const pak = new PakFile('./game.pak');
pak.setKey('generic-key');
```

#### v2.x (Support Spécifique)
```typescript
// Fortnite-specific support
import { FortniteAssetParser, FortniteKeyManager } from 'unpak.js';

const fortKeyManager = new FortniteKeyManager();
await fortKeyManager.loadKeysFromEndpoint(); // Auto-fetch latest keys
const fortParser = new FortniteAssetParser();

const skinData = await archive.getFile('Game/Athena/Items/Cosmetics/Characters/CID_123.uasset');
const skin = await fortParser.parseAsset(skinData, 'UFortHeroType');

console.log(`Skin: ${skin.getDisplayName()}`);
console.log(`Rarity: ${skin.getRarity()}`);
console.log(`Variants: ${skin.getVariants().length}`);

// Valorant-specific support
import { ValorantAssetParser } from 'unpak.js';

const valParser = new ValorantAssetParser();
const weaponData = await archive.getFile('Game/Weapons/Rifle/AK47/AK47_Skin_Dragon.uasset');
const weapon = await valParser.parseAsset(weaponData, 'UValorantWeaponSkin');
```

## ⚡ Performance et Optimisations

### v1.x → v2.x Performance

#### v1.x
```javascript
// No memory optimization
pak.extract('large-file.uasset', (err, data) => {
    // Entire file loaded into memory
    processData(data);
});
```

#### v2.x
```typescript
// Streaming and memory optimization
const archive = await openPakArchive('./large.pak', keyManager, {
    enableStreaming: true,
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB limit
    enableCaching: true
});

// Memory monitoring
const monitor = archive.createMemoryMonitor();
monitor.on('memoryWarning', (usage) => {
    console.warn(`High memory usage: ${usage.heapUsed / 1024 / 1024} MB`);
});

// Parallel processing with worker threads
const workerPool = new WorkerPool(4);
const results = await workerPool.processAssets(largeAssetList);
```

## 🔧 Configuration et Options

### v2.x Configuration Options

```typescript
// Archive opening options
const archive = await openPakArchive('./game.pak', keyManager, {
    enableStreaming: true,           // Enable streaming for large files
    maxMemoryUsage: 1024 * 1024 * 1024, // 1GB memory limit
    enableCaching: true,             // Enable smart caching
    compressionFormat: 'auto',       // Auto-detect compression
    encryptionMode: 'multi-key',     // Multi-key encryption support
    gameDetection: true,             // Auto-detect game type
    version: 'auto'                  // Auto-detect UE version
});

// Logging configuration
logger.configure({
    level: LogLevel.INFO,
    format: 'json',
    enableColors: true,
    outputFile: './logs/unpak.log'
});

// Performance configuration
const perfConfig = {
    workerThreads: 4,                // Number of worker threads
    chunkSize: 64 * 1024 * 1024,     // 64MB chunk size
    cacheSize: 500 * 1024 * 1024,    // 500MB cache size
    enableProfiling: true            // Enable performance profiling
};
```

## 🧪 Testing et Validation

### v1.x → v2.x Testing

#### v1.x (Basic testing)
```javascript
// Manual testing only
const pak = new PakFile('./test.pak');
const data = pak.extract('test.uasset');
console.log(data ? 'Success' : 'Failed');
```

#### v2.x (Comprehensive testing)
```typescript
import { openPakArchive, createKeyManager, validateAsset } from 'unpak.js';

// Automated testing
describe('Archive Operations', () => {
    let archive: PakArchive;
    let keyManager: KeyManager;

    beforeEach(async () => {
        keyManager = createKeyManager();
        await keyManager.submitKey('test-guid', '0x123...');
        archive = await openPakArchive('./tests/fixtures/test.pak', keyManager);
    });

    afterEach(async () => {
        await archive.close();
    });

    test('should extract files correctly', async () => {
        const files = archive.listFiles('*.uasset');
        expect(files.length).toBeGreaterThan(0);

        const data = await archive.getFile(files[0].path);
        expect(data).toBeInstanceOf(Buffer);
        expect(data.length).toBe(files[0].size);
    });

    test('should parse assets correctly', async () => {
        const textureData = await archive.getFile('test_texture.uasset');
        const texture = await parseAsset(textureData, 'UTexture2D');
        
        expect(texture.sizeX).toBeGreaterThan(0);
        expect(texture.sizeY).toBeGreaterThan(0);
        expect(texture.pixelFormat).toBeDefined();
    });
});
```

## 📚 Documentation et Resources

### Nouvelles Resources v2.x

```bash
# Documentation structure
docs/
├── README.md                    # Vue d'ensemble mise à jour
├── ROADMAP.md                   # Roadmap 15 phases
├── MIGRATION.md                 # Ce guide de migration
├── CUE4PARSE_FMODEL_REFERENCE.md # Guide de référence
├── MODERNIZATION_SUMMARY.md    # Résumé de modernisation
├── api/                         # API reference complète
│   ├── interfaces.md           # Interfaces principales
│   ├── classes.md              # Classes et méthodes
│   └── examples.md             # Exemples d'usage
├── examples/                    # Exemples pratiques
│   ├── basic-usage/            # Usage de base
│   ├── game-specific/          # Usage spécifique par jeu
│   ├── advanced/               # Fonctionnalités avancées
│   └── performance/            # Optimisations
└── guides/                      # Guides step-by-step
    ├── getting-started.md      # Démarrage rapide
    ├── asset-parsing.md        # Parsing d'assets
    ├── game-support.md         # Support multi-jeux
    └── troubleshooting.md      # Résolution de problèmes
```

## 🚀 Migration Step-by-Step

### Étape 1: Installation
```bash
# Désinstaller v1.x
npm uninstall unpak

# Installer v2.x
npm install unpak.js@2.0.0-alpha.1

# Installer types si nécessaire
npm install --save-dev @types/node
```

### Étape 2: Mise à jour des Imports
```typescript
// Remplacer tous les imports v1.x
// const PakFile = require('unpak');
// import PakFile from 'unpak';

// Par les imports v2.x modulaires
import { 
    openPakArchive, 
    createKeyManager, 
    parseAsset, 
    convertTexture,
    LogLevel,
    logger 
} from 'unpak.js';
```

### Étape 3: Refactoring de l'API
```typescript
// 1. Remplacer la création d'instance
// const pak = new PakFile('./game.pak');

// Par l'ouverture d'archive
const keyManager = createKeyManager();
const archive = await openPakArchive('./game.pak', keyManager);

// 2. Remplacer la gestion des clés
// pak.setKey('key');

// Par la soumission de clés avec GUID
await keyManager.submitKey('guid', '0x123...');

// 3. Remplacer les callbacks par async/await
// pak.extract('file', (err, data) => { ... });

// Par des promesses
const data = await archive.getFile('file');
```

### Étape 4: Ajout de Gestion d'Erreurs
```typescript
// Remplacer la gestion d'erreurs basique
try {
    const data = await archive.getFile('file.uasset');
    // Process data
} catch (error) {
    if (error instanceof AssetNotFoundError) {
        console.warn('Asset not found, using fallback');
    } else if (error instanceof DecryptionError) {
        console.error('Invalid encryption key');
    } else {
        throw error; // Unexpected error
    }
}
```

### Étape 5: Optimisation et Features
```typescript
// Ajouter les nouvelles fonctionnalités v2.x
// - Asset parsing automatique
// - Conversion de formats
// - Support multi-jeux
// - Performance monitoring
// - Memory management

// Configuration de logging
logger.setLevel(LogLevel.INFO);

// Monitoring des performances
const monitor = archive.createMemoryMonitor();
monitor.on('memoryWarning', (usage) => {
    console.warn('High memory usage detected');
});
```

## ⚠️ Points d'Attention

### Compatibilité Node.js
- **v1.x**: Node.js 12+
- **v2.x**: Node.js 18+ (LTS recommandé)

### Gestion Mémoire
- **v1.x**: Pas d'optimisation mémoire
- **v2.x**: Streaming et pooling pour fichiers >100MB

### Performance
- **v1.x**: Single-threaded, synchrone
- **v2.x**: Multi-threaded, asynchrone avec Worker support

### Sécurité
- **v1.x**: Gestion basique des clés
- **v2.x**: Système multi-clés avec cache sécurisé

## 🎉 Avantages de la Migration

### Fonctionnalités Nouvelles
- ✅ **32+ Asset Types**: Support complet UE4/UE5
- ✅ **Multi-Game Support**: Fortnite, Valorant, et plus
- ✅ **Advanced Export**: OBJ, glTF, PNG, WAV, TGA, DDS
- ✅ **3D Mesh Export**: Avec matériaux et squelettes
- ✅ **Performance**: Memory pooling et streaming
- ✅ **Developer Tools**: CLI et profiling

### Qualité et Maintenance
- ✅ **TypeScript Strict**: Type safety complet
- ✅ **Comprehensive Tests**: 102+ tests automatisés
- ✅ **Documentation**: Documentation complète et exemples
- ✅ **Community**: Support actif et contributions

### Performance Amélioration
- ✅ **2x Plus Rapide**: Parsing d'assets optimisé
- ✅ **Memory Efficient**: Support fichiers >100GB
- ✅ **Multi-threading**: Worker threads pour performances
- ✅ **Smart Caching**: LRU cache avec monitoring

---

## 📞 Support Migration

### Resources d'Aide
- **GitHub Issues**: Questions techniques spécifiques
- **GitHub Discussions**: Discussion architecture et migration  
- **Discord Community**: Support temps réel
- **Documentation**: Guides détaillés et exemples

### Migration Assistance
Pour les projets complexes nécessitant une assistance de migration:
1. Ouvrir une issue GitHub avec le tag `migration-help`
2. Fournir des détails sur l'usage actuel v1.x
3. Recevoir des conseils personnalisés et exemples

---

*Guide de migration v2.0 | Dernière mise à jour: Q2 2024*