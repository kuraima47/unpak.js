# unpak.js v2.0 - Guide d'Utilisation des Nouvelles Features Enterprise

Ce guide vous explique comment utiliser les nouvelles fonctionnalités enterprise implémentées dans les Phases 9 et 12 de la roadmap.

## 📊 Database Integration (Phase 12)

### Configuration de Base

```typescript
import { UnpakDatabaseProvider } from 'unpak.js';

// Configuration SQLite (développement)
const database = new UnpakDatabaseProvider({
    provider: 'sqlite',
    enableQueryLog: true,
    enableMetrics: true
});

await database.initialize({
    provider: 'sqlite',
    connectionString: './unpak.db'
});

// Configuration PostgreSQL (production)
const prodDatabase = new UnpakDatabaseProvider({
    provider: 'postgresql',
    poolSize: 20,
    connectionTimeout: 30000
});

await prodDatabase.initialize({
    provider: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'unpak_prod',
    username: 'unpak_user',
    password: 'secure_password',
    ssl: true
});
```

### Stockage et Recherche d'Assets

```typescript
// Stocker des métadonnées d'assets
const assetId = await database.storeAssetMetadata({
    assetId: 'char_001',
    name: 'MainCharacter',
    path: '/Game/Characters/Main.uasset',
    type: 'USkeletalMesh',
    size: 15 * 1024 * 1024, // 15MB
    checksum: 'sha256_hash_here',
    archiveSource: 'MyGame-Windows.pak',
    tags: ['character', 'hero', 'animated'],
    dependencies: ['mesh_base', 'texture_diffuse'],
    tenantId: 'my_studio'
});

// Rechercher des assets
const characters = await database.searchAssets({
    tenantId: 'my_studio',
    type: 'USkeletalMesh',
    tags: ['character'],
    sizeMin: 10 * 1024 * 1024, // Plus de 10MB
    sortBy: 'size',
    sortDirection: 'DESC',
    limit: 20
});

console.log(`Found ${characters.length} character assets`);
```

### Métriques de Performance

```typescript
// Enregistrer des métriques
await database.storePerformanceMetrics({
    metricId: `parsing_${Date.now()}`,
    operationType: 'asset_parsing',
    durationMs: 2500,
    memoryUsageMb: 512,
    cpuUsagePercent: 75,
    archiveSource: 'MyGame-Windows.pak',
    assetCount: 1500,
    tenantId: 'my_studio',
    timestamp: new Date().toISOString(),
    metadata: {
        workerThreads: 4,
        compressionType: 'zlib'
    }
});

// Analyser les performances
const analytics = await database.getPerformanceAnalytics({
    tenantId: 'my_studio',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z'
});

console.log(`Average parsing time: ${analytics.operationStats[0]?.averageDuration}ms`);
```

## 🏢 Multi-Tenant Support (Phase 12)

### Configuration Multi-Tenant

```typescript
import { MultiTenantManager } from 'unpak.js';

const multiTenant = new MultiTenantManager(database);
await multiTenant.initialize();

// Créer des tenants pour différents plans
const gameStudio = await multiTenant.createTenant({
    tenantId: 'indie_studio',
    name: 'Indie Game Studio',
    plan: 'professional',
    billingEmail: 'billing@indiegames.com',
    ipWhitelist: ['192.168.1.0/24'],
    sessionTimeout: 7200, // 2 heures
    customSettings: {
        enableAdvancedFeatures: true,
        maxArchivesPerUser: 10
    }
});

const enterprise = await multiTenant.createTenant({
    tenantId: 'enterprise_corp',
    name: 'Enterprise Corporation',
    plan: 'enterprise',
    billingEmail: 'enterprise@corp.com',
    customSettings: {
        enableAuditLogging: true,
        requireMfa: true,
        customBranding: true
    }
});
```

### Gestion des Sessions

```typescript
// Créer une session utilisateur
const session = await multiTenant.createSession(
    'indie_studio', 
    'developer_001',
    'unpak-client/1.0.0'
);

console.log(`Session created: ${session.sessionId}`);
console.log(`Expires: ${session.expiresAt}`);

// Valider une session avec permissions
try {
    const validSession = multiTenant.validateSession(
        session.sessionId, 
        'asset_read' // Permission requise
    );
    
    console.log('Access granted for asset reading');
} catch (error) {
    console.error('Access denied:', error.message);
}
```

### Contrôle des Ressources

```typescript
// Vérifier les limites avant une opération
const operation = {
    memoryRequired: 2048, // 2GB
    storageRequired: 5 * 1024, // 5GB
    cpuRequired: 4 // 4 cores
};

const check = multiTenant.checkResourceLimits('indie_studio', operation);

if (check.allowed) {
    console.log('Operation can proceed');
    
    // Effectuer l'opération puis mettre à jour l'usage
    multiTenant.updateResourceUsage('indie_studio', {
        memoryUsed: 1800,
        storageUsed: 15360, // 15GB total
        cpuUsed: 6
    });
} else {
    console.error('Operation blocked:', check.reason);
}

// Surveillance de l'usage
multiTenant.on('resourceWarning', (warning) => {
    console.warn(`Resource warning for ${warning.tenantId}: ${warning.type} at ${warning.percentage}%`);
    
    // Envoyer notification à l'admin du tenant
    sendNotificationToTenant(warning.tenantId, warning);
});
```

### Rapports d'Utilisation

```typescript
// Générer un rapport d'utilisation
const usage = multiTenant.getTenantUsage('indie_studio');

if (usage) {
    console.log(`Tenant: ${usage.tenantId}`);
    console.log(`Plan: ${usage.plan}`);
    console.log(`Memory usage: ${usage.usagePercentages.memory.toFixed(1)}%`);
    console.log(`Storage usage: ${usage.usagePercentages.storage.toFixed(1)}%`);
    console.log(`CPU usage: ${usage.usagePercentages.cpu.toFixed(1)}%`);
    console.log(`Active sessions: ${usage.activeSessions}`);
    
    // Facturation
    console.log(`API calls this month: ${usage.billing.apiCalls}`);
    console.log(`Compute time: ${usage.billing.computeTime}ms`);
}
```

## 🎨 Blueprint Plugin Support (Phase 9)

### Utilisation des Plugins Blueprint

```typescript
import { BlueprintPlugin } from 'unpak.js';

// Charger un plugin Blueprint depuis un asset
const plugin = new BlueprintPlugin();
// (Normalement chargé depuis un fichier .uasset)

// Configuration simulée
plugin.PluginName.text = 'AdvancedUI';
plugin.PluginVersion = '2.1.0';
plugin.PluginDescription = 'Advanced UI widgets and HUD components';
plugin.PluginAuthor = 'UI Masters Studio';
plugin.RequiredEngineVersion = '5.1.0';
plugin.SupportedTargetPlatforms = ['Win64', 'Mac', 'Linux', 'PS5', 'Xbox'];
plugin.bCanContainContent = true;
plugin.bIsRuntimePlugin = true;

// Validation de compatibilité
const compatibility = plugin.validateCompatibility('5.3.0', 'Win64');

if (compatibility.isCompatible) {
    console.log('Plugin is compatible!');
    
    // Extraire les classes Blueprint
    const classes = plugin.extractBlueprintClasses();
    console.log(`Found ${classes.length} Blueprint classes`);
    
    // Métadonnées pour marketplace
    const marketplaceInfo = plugin.getMarketplaceMetadata();
    console.log(`Plugin: ${marketplaceInfo.pluginName} v${marketplaceInfo.version}`);
    console.log(`Platforms: ${marketplaceInfo.supportedPlatforms.join(', ')}`);
    
} else {
    console.error('Plugin compatibility issues:');
    compatibility.errors.forEach(error => console.error(`- ${error}`));
    compatibility.warnings.forEach(warning => console.warn(`- ${warning}`));
}
```

## 🔄 Intégration Complète Enterprise

### Workflow Complet

```typescript
import { 
    UnpakDatabaseProvider, 
    MultiTenantManager,
    UnpakRestServer,
    UnpakWebInterface 
} from 'unpak.js';

class EnterpriseUnpakService {
    private database: UnpakDatabaseProvider;
    private multiTenant: MultiTenantManager;
    private apiServer: UnpakRestServer;
    private webInterface: UnpakWebInterface;
    
    async initialize() {
        // 1. Setup database
        this.database = new UnpakDatabaseProvider({
            provider: 'postgresql',
            enableMetrics: true
        });
        
        await this.database.initialize({
            provider: 'postgresql',
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        
        // 2. Setup multi-tenant
        this.multiTenant = new MultiTenantManager(this.database);
        await this.multiTenant.initialize();
        
        // 3. Setup API server
        this.apiServer = new UnpakRestServer({ 
            port: 3000,
            enableCors: true,
            maxRequestSize: 100 * 1024 * 1024 // 100MB
        });
        
        // 4. Setup web interface
        this.webInterface = new UnpakWebInterface({
            port: 8080,
            apiPort: 3000,
            theme: 'dark'
        });
        
        console.log('Enterprise unpak.js service ready!');
        console.log('API: http://localhost:3000');
        console.log('Web: http://localhost:8080');
    }
    
    async createCustomerTenant(customerInfo: any) {
        return await this.multiTenant.createTenant({
            tenantId: customerInfo.id,
            name: customerInfo.companyName,
            plan: customerInfo.plan,
            billingEmail: customerInfo.billingEmail,
            ipWhitelist: customerInfo.allowedIPs
        });
    }
    
    async processAssets(tenantId: string, archivePath: string) {
        // Vérifier les ressources
        const resourceCheck = this.multiTenant.checkResourceLimits(tenantId, {
            memoryRequired: 1024,
            storageRequired: 2048
        });
        
        if (!resourceCheck.allowed) {
            throw new Error(`Resource limit exceeded: ${resourceCheck.reason}`);
        }
        
        const startTime = Date.now();
        
        // Traiter les assets...
        // (intégration avec votre logique de parsing)
        
        // Enregistrer les métriques
        await this.database.storePerformanceMetrics({
            metricId: `processing_${Date.now()}`,
            operationType: 'archive_processing',
            durationMs: Date.now() - startTime,
            memoryUsageMb: 1024,
            tenantId,
            timestamp: new Date().toISOString()
        });
    }
}

// Utilisation
const service = new EnterpriseUnpakService();
await service.initialize();
```

## 🚀 Mise en Production

### Configuration Recommandée

```typescript
// Production config
const productionConfig = {
    database: {
        provider: 'postgresql',
        poolSize: 20,
        connectionTimeout: 30000,
        enableQueryLog: false, // Désactiver en prod
        enableMetrics: true
    },
    multiTenant: {
        resourceMonitoringInterval: 30000, // 30s
        sessionCleanupInterval: 300000, // 5min
        maxSessionsPerTenant: 100
    },
    api: {
        port: process.env.PORT || 3000,
        enableCors: false, // Gérer par reverse proxy
        requestTimeout: 60000,
        maxRequestSize: 50 * 1024 * 1024 // 50MB
    }
};
```

### Monitoring et Alertes

```typescript
// Setup monitoring
multiTenant.on('resourceWarning', async (warning) => {
    await sendAlert({
        type: 'resource_warning',
        tenant: warning.tenantId,
        resource: warning.type,
        usage: warning.percentage,
        timestamp: new Date()
    });
});

multiTenant.on('tenantCreated', async (event) => {
    await logAuditEvent({
        action: 'tenant_created',
        tenant: event.tenant.tenantId,
        plan: event.tenant.plan,
        timestamp: new Date()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        database: database.isConnected(),
        tenants: multiTenant.getActiveTenantCount(),
        uptime: process.uptime()
    });
});
```

Ces nouvelles fonctionnalités enterprise permettent de déployer unpak.js dans des environnements de production avec une architecture multi-tenant robuste, une base de données intégrée et un support complet des plugins Blueprint.