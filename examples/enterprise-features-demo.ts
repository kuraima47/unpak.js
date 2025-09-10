import { 
    createDatabaseIntegration, 
    IAssetMetadata, 
    IPerformanceMetrics 
} from '../src/enterprise/DatabaseIntegration';
import { 
    MultiTenantManager, 
    createTenantWithPlan, 
    TENANT_PLANS 
} from '../src/enterprise/MultiTenantManager';
import { 
    createParallelProcessor,
    IWorkerTask
} from '../src/performance/WorkerThreads';

/**
 * Enterprise Features Demo
 * Demonstrates the newly implemented Phase 12 Enterprise Features:
 * - Database Integration
 * - Multi-Tenant Support  
 * - Worker Thread Performance Optimization
 */

async function demonstrateEnterpriseFeatures() {
    console.log('🚀 unpak.js v2.0 Enterprise Features Demo');
    console.log('=====================================');

    // Initialize database integration
    console.log('\n📊 Initializing Database Integration...');
    const database = createDatabaseIntegration('memory');
    await database.initialize();
    console.log('✅ Database initialized');

    // Initialize multi-tenant manager
    console.log('\n🏢 Setting up Multi-Tenant Environment...');
    const multiTenant = new MultiTenantManager(database);
    await multiTenant.initialize();
    console.log('✅ Multi-tenant manager initialized');

    // Create demo tenants
    console.log('\n👥 Creating Demo Tenants...');
    
    const indieStudio = await multiTenant.createTenant(createTenantWithPlan(
        'indie_studio_001',
        'Indie Game Studio',
        'billing@indiegames.com',
        'professional',
        {
            enableAdvancedFeatures: true,
            maxArchivesPerUser: 15
        }
    ));
    console.log(`✅ Created tenant: ${indieStudio.name} (${indieStudio.plan})`);

    const enterpriseCorp = await multiTenant.createTenant(createTenantWithPlan(
        'enterprise_corp_001',
        'Enterprise Corporation',
        'enterprise@corp.com',
        'enterprise',
        {
            enableCustomPlugins: true,
            maxDataRetentionDays: 365
        }
    ));
    console.log(`✅ Created tenant: ${enterpriseCorp.name} (${enterpriseCorp.plan})`);

    // Create tenant sessions
    console.log('\n🔐 Creating Tenant Sessions...');
    
    const session1 = await multiTenant.createSession(
        'indie_studio_001',
        '192.168.1.100',
        'dev_user_1',
        'unpak.js-demo-client/1.0'
    );
    console.log(`✅ Session created: ${session1.sessionId}`);

    const session2 = await multiTenant.createSession(
        'enterprise_corp_001',
        '10.0.0.50',
        'enterprise_user_1',
        'unpak.js-enterprise-client/2.0'
    );
    console.log(`✅ Session created: ${session2.sessionId}`);

    // Demonstrate resource checking
    console.log('\n🔍 Testing Resource Limits...');
    
    const resourceCheck = multiTenant.checkResourceLimits('indie_studio_001', {
        memoryRequired: 2048,
        storageRequired: 5120,
        cpuRequired: 2
    });
    
    if (resourceCheck.allowed) {
        console.log('✅ Resource allocation approved');
        multiTenant.updateResourceUsage('indie_studio_001', {
            memoryMb: 2048,
            storageMb: 5120,
            cpuCores: 2
        });
    } else {
        console.log(`❌ Resource allocation denied: ${resourceCheck.reason}`);
    }

    // Store demo asset metadata
    console.log('\n📁 Storing Asset Metadata...');
    
    const demoAssets: IAssetMetadata[] = [
        {
            assetId: 'char_001',
            name: 'MainCharacter',
            path: '/Game/Characters/Main.uasset',
            type: 'USkeletalMesh',
            size: 15 * 1024 * 1024,
            checksum: 'sha256_abc123',
            archiveSource: 'MyGame-Windows.pak',
            tags: ['character', 'hero', 'animated'],
            dependencies: ['mesh_base', 'texture_diffuse'],
            tenantId: 'indie_studio_001',
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0
        },
        {
            assetId: 'env_001',
            name: 'ForestLevel',
            path: '/Game/Levels/Forest.umap',
            type: 'UWorld',
            size: 45 * 1024 * 1024,
            checksum: 'sha256_def456',
            archiveSource: 'MyGame-Windows.pak',
            tags: ['environment', 'level', 'forest'],
            dependencies: ['lighting_data', 'landscape_materials'],
            tenantId: 'indie_studio_001',
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0
        },
        {
            assetId: 'ui_001',
            name: 'MainMenu',
            path: '/Game/UI/MainMenu.uasset',
            type: 'UUserWidget',
            size: 2 * 1024 * 1024,
            checksum: 'sha256_ghi789',
            archiveSource: 'MyGame-Windows.pak',
            tags: ['ui', 'menu', 'interface'],
            dependencies: ['button_textures', 'font_assets'],
            tenantId: 'enterprise_corp_001',
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0
        }
    ];

    for (const asset of demoAssets) {
        const assetId = await database.storeAssetMetadata(asset);
        console.log(`✅ Stored asset: ${asset.name} (${assetId})`);
        
        // Store dependencies
        for (const dep of asset.dependencies) {
            await database.storeDependency(asset.assetId, dep, asset.tenantId);
        }
    }

    // Search assets
    console.log('\n🔎 Searching Assets...');
    
    const characterAssets = await database.searchAssets({
        tenantId: 'indie_studio_001',
        tags: ['character'],
        sortBy: 'size',
        sortDirection: 'DESC'
    });
    console.log(`✅ Found ${characterAssets.length} character assets`);

    const largeAssets = await database.searchAssets({
        tenantId: 'indie_studio_001',
        sizeMin: 10 * 1024 * 1024,
        sortBy: 'size',
        sortDirection: 'DESC'
    });
    console.log(`✅ Found ${largeAssets.length} large assets (>10MB)`);

    // Store performance metrics
    console.log('\n📈 Recording Performance Metrics...');
    
    const performanceMetrics: IPerformanceMetrics[] = [
        {
            metricId: `perf_${Date.now()}_1`,
            operationType: 'asset_extraction',
            durationMs: 1250,
            memoryUsageMb: 256,
            assetsProcessed: 5,
            tenantId: 'indie_studio_001',
            timestamp: new Date().toISOString(),
            success: true
        },
        {
            metricId: `perf_${Date.now()}_2`,
            operationType: 'conversion',
            durationMs: 2100,
            memoryUsageMb: 512,
            assetsProcessed: 3,
            tenantId: 'indie_studio_001',
            timestamp: new Date().toISOString(),
            success: true
        },
        {
            metricId: `perf_${Date.now()}_3`,
            operationType: 'archive_processing',
            durationMs: 5600,
            memoryUsageMb: 1024,
            assetsProcessed: 25,
            tenantId: 'enterprise_corp_001',
            timestamp: new Date().toISOString(),
            success: true
        }
    ];

    for (const metric of performanceMetrics) {
        await database.storePerformanceMetrics(metric);
        multiTenant.trackApiCall(metric.tenantId, metric.durationMs);
    }
    console.log(`✅ Recorded ${performanceMetrics.length} performance metrics`);

    // Generate analytics
    console.log('\n📊 Generating Analytics...');
    
    const analytics = await database.getAnalytics({
        tenantId: 'indie_studio_001',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        endDate: new Date()
    });

    console.log('📈 Analytics Results:');
    console.log(`   Operations: ${analytics.operationStats.length} types`);
    console.log(`   Asset Types: ${analytics.assetTypeDistribution.length} types`);
    analytics.operationStats.forEach(stat => {
        console.log(`   - ${stat.operationType}: ${stat.count} ops, avg ${stat.averageDuration.toFixed(0)}ms`);
    });

    // Demonstrate worker thread processing
    console.log('\n⚡ Initializing Worker Thread Processing...');
    
    const processor = createParallelProcessor({
        maxWorkers: 4,
        taskTimeout: 10000,
        enableProfiling: true
    });
    await processor.initialize();
    console.log('✅ Worker pool initialized');

    // Simulate parallel asset processing
    console.log('\n🔄 Processing Assets in Parallel...');
    
    const extractionTasks = [
        { path: 'FortniteGame.pak', assets: ['Character1.uasset', 'Weapon1.uasset'] },
        { path: 'ValorantGame.pak', assets: ['Map1.umap', 'Agent1.uasset'] },
        { path: 'MyGame.pak', assets: ['Level1.umap', 'Audio1.uasset', 'Texture1.uasset'] }
    ];

    try {
        const results = await processor.extractAssets(extractionTasks);
        console.log(`✅ Processed ${results.length} assets in parallel`);
        
        const successfulResults = results.filter(r => r.success);
        const failedResults = results.filter(r => !r.success);
        
        console.log(`   - Successful: ${successfulResults.length}`);
        console.log(`   - Failed: ${failedResults.length}`);
        
        if (successfulResults.length > 0) {
            const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
            console.log(`   - Average duration: ${avgDuration.toFixed(0)}ms`);
        }
    } catch (error: any) {
        console.error(`❌ Parallel processing failed: ${error.message}`);
    }

    // Show worker pool stats
    const poolStats = processor.getStats();
    console.log('\n📊 Worker Pool Statistics:');
    console.log(`   - Total workers: ${poolStats.totalWorkers}`);
    console.log(`   - Active workers: ${poolStats.activeWorkers}`);
    console.log(`   - Completed tasks: ${poolStats.completedTasks}`);
    console.log(`   - Failed tasks: ${poolStats.failedTasks}`);
    console.log(`   - Memory usage: ${(poolStats.memoryUsage.current / 1024 / 1024).toFixed(1)}MB`);

    // Show tenant usage summaries
    console.log('\n💼 Tenant Usage Summary:');
    
    for (const tenantId of ['indie_studio_001', 'enterprise_corp_001']) {
        const usage = multiTenant.getTenantUsage(tenantId);
        const tenant = multiTenant.getTenant(tenantId);
        
        if (usage && tenant) {
            console.log(`\n   ${tenant.name} (${tenant.plan}):`);
            console.log(`   - Memory: ${usage.usagePercentages.memory.toFixed(1)}% (${usage.currentUsage.memoryMb}MB)`);
            console.log(`   - Storage: ${usage.usagePercentages.storage.toFixed(1)}% (${usage.currentUsage.storageMb}MB)`);
            console.log(`   - CPU: ${usage.usagePercentages.cpu.toFixed(1)}% (${usage.currentUsage.cpuCores} cores)`);
            console.log(`   - Sessions: ${usage.currentUsage.activeSessions}/${usage.limits.maxSessions}`);
            console.log(`   - API calls: ${usage.billing.apiCalls}`);
            console.log(`   - Compute time: ${(usage.billing.computeTime / 1000).toFixed(1)}s`);
        }
    }

    // Test resource warnings
    console.log('\n⚠️  Testing Resource Warning System...');
    
    multiTenant.on('resourceWarning', (warning) => {
        console.log(`🚨 Resource warning for ${warning.tenantId}: ${warning.resource} at ${warning.percentage.toFixed(1)}%`);
    });

    // Simulate high resource usage to trigger warnings
    multiTenant.updateResourceUsage('indie_studio_001', {
        memoryMb: 3500 // This should trigger a warning (>80% of 4096MB limit)
    });

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    
    await processor.shutdown();
    console.log('✅ Worker pool shut down');
    
    await multiTenant.shutdown();
    console.log('✅ Multi-tenant manager shut down');
    
    await database.close();
    console.log('✅ Database closed');

    console.log('\n🎉 Enterprise Features Demo Complete!');
    console.log('\nKey Features Demonstrated:');
    console.log('- ✅ Database Integration with asset metadata and analytics');
    console.log('- ✅ Multi-tenant architecture with resource management');
    console.log('- ✅ Session management and security controls');
    console.log('- ✅ Performance monitoring and billing tracking');
    console.log('- ✅ Worker thread parallel processing');
    console.log('- ✅ Resource usage monitoring and warnings');
    console.log('\nThese features enable enterprise-grade deployment of unpak.js!');
}

// Performance benchmark demo
async function benchmarkWorkerPerformance() {
    console.log('\n🏁 Worker Thread Performance Benchmark');
    console.log('=====================================');

    const processor = createParallelProcessor({
        maxWorkers: 8,
        taskTimeout: 5000,
        enableProfiling: true
    });
    
    await processor.initialize();

    const startTime = Date.now();
    
    // Simulate heavy workload
    const conversions = Array.from({ length: 50 }, (_, i) => ({
        input: Buffer.alloc(1024 * 100), // 100KB dummy data
        fromFormat: 'UTexture2D',
        toFormat: 'PNG'
    }));

    const results = await processor.convertAssets(conversions);
    const endTime = Date.now();

    const totalDuration = endTime - startTime;
    const successCount = results.filter(r => r.success).length;
    const throughput = successCount / (totalDuration / 1000);

    console.log(`\n📊 Benchmark Results:`);
    console.log(`   - Total tasks: ${conversions.length}`);
    console.log(`   - Successful: ${successCount}`);
    console.log(`   - Total time: ${totalDuration}ms`);
    console.log(`   - Throughput: ${throughput.toFixed(2)} tasks/second`);
    console.log(`   - Average task time: ${(totalDuration / successCount).toFixed(0)}ms`);

    const poolStats = processor.getStats();
    console.log(`   - Peak memory: ${(poolStats.memoryUsage.peak / 1024 / 1024).toFixed(1)}MB`);

    await processor.shutdown();
    console.log('✅ Benchmark complete');
}

// Run the demos
async function main() {
    try {
        await demonstrateEnterpriseFeatures();
        await benchmarkWorkerPerformance();
    } catch (error: any) {
        console.error('❌ Demo failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main();
}

export { demonstrateEnterpriseFeatures, benchmarkWorkerPerformance };