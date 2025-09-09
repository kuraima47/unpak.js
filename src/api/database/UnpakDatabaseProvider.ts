import { EventEmitter } from 'events';
import { logger } from '../../core/logging/Logger';

/**
 * Database Integration for unpak.js Enterprise Features
 * Addresses roadmap item: "Enterprise Features - Intégration base de données"
 * 
 * Provides persistent storage and advanced querying capabilities for:
 * - Asset metadata and indexing
 * - Performance metrics and analytics
 * - User management and permissions
 * - Audit trails and version tracking
 * - Multi-tenant data isolation
 */
export class UnpakDatabaseProvider extends EventEmitter {
    private connections: Map<string, DatabaseConnection> = new Map();
    private activeConnection: DatabaseConnection | null = null;
    private readonly options: DatabaseProviderOptions;
    
    constructor(options: DatabaseProviderOptions = {}) {
        super();
        this.options = {
            provider: options.provider || 'sqlite',
            connectionTimeout: options.connectionTimeout || 30000,
            poolSize: options.poolSize || 10,
            enableQueryLog: options.enableQueryLog || false,
            enableMetrics: options.enableMetrics || true,
            ...options
        };
    }
    
    /**
     * Initialize database connection and schema
     */
    async initialize(config: DatabaseConfig): Promise<void> {
        try {
            logger.info('Initializing database connection', { provider: config.provider });
            
            const connection = await this.createConnection(config);
            this.activeConnection = connection;
            this.connections.set('default', connection);
            
            await this.setupSchema();
            await this.setupIndices();
            
            this.emit('initialized', { provider: config.provider });
            logger.info('Database initialized successfully');
            
        } catch (error: any) {
            logger.error('Failed to initialize database', undefined, { error: error.message });
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Store asset metadata in database
     */
    async storeAssetMetadata(metadata: AssetMetadata): Promise<string> {
        const connection = this.getActiveConnection();
        
        const query = `
            INSERT INTO asset_metadata (
                asset_id, name, path, type, size, checksum, 
                archive_source, last_modified, tags, dependencies,
                tenant_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(asset_id, tenant_id) DO UPDATE SET
                name = excluded.name,
                path = excluded.path,
                size = excluded.size,
                checksum = excluded.checksum,
                last_modified = excluded.last_modified,
                tags = excluded.tags,
                dependencies = excluded.dependencies,
                updated_at = excluded.updated_at
        `;
        
        const now = new Date().toISOString();
        const params = [
            metadata.assetId,
            metadata.name,
            metadata.path,
            metadata.type,
            metadata.size,
            metadata.checksum,
            metadata.archiveSource,
            metadata.lastModified,
            JSON.stringify(metadata.tags || []),
            JSON.stringify(metadata.dependencies || []),
            metadata.tenantId || 'default',
            now,
            now
        ];
        
        await connection.execute(query, params);
        
        this.emit('assetStored', { assetId: metadata.assetId, tenantId: metadata.tenantId });
        return metadata.assetId;
    }
    
    /**
     * Search assets with advanced filtering
     */
    async searchAssets(criteria: AssetSearchCriteria): Promise<AssetMetadata[]> {
        const connection = this.getActiveConnection();
        
        let query = `
            SELECT asset_id, name, path, type, size, checksum, 
                   archive_source, last_modified, tags, dependencies,
                   tenant_id, created_at, updated_at
            FROM asset_metadata
            WHERE tenant_id = ?
        `;
        
        const params: any[] = [criteria.tenantId || 'default'];
        
        // Add search filters
        if (criteria.name) {
            query += ` AND name LIKE ?`;
            params.push(`%${criteria.name}%`);
        }
        
        if (criteria.type) {
            query += ` AND type = ?`;
            params.push(criteria.type);
        }
        
        if (criteria.archiveSource) {
            query += ` AND archive_source = ?`;
            params.push(criteria.archiveSource);
        }
        
        if (criteria.tags && criteria.tags.length > 0) {
            const tagConditions = criteria.tags.map(() => `JSON_EXTRACT(tags, '$') LIKE ?`).join(' AND ');
            query += ` AND (${tagConditions})`;
            criteria.tags.forEach(tag => params.push(`%"${tag}"%`));
        }
        
        if (criteria.sizeMin !== undefined) {
            query += ` AND size >= ?`;
            params.push(criteria.sizeMin);
        }
        
        if (criteria.sizeMax !== undefined) {
            query += ` AND size <= ?`;
            params.push(criteria.sizeMax);
        }
        
        // Add sorting
        if (criteria.sortBy) {
            const direction = criteria.sortDirection || 'ASC';
            query += ` ORDER BY ${criteria.sortBy} ${direction}`;
        }
        
        // Add pagination
        if (criteria.limit) {
            query += ` LIMIT ?`;
            params.push(criteria.limit);
            
            if (criteria.offset) {
                query += ` OFFSET ?`;
                params.push(criteria.offset);
            }
        }
        
        const results = await connection.query(query, params);
        
        return results.map(row => ({
            assetId: row.asset_id,
            name: row.name,
            path: row.path,
            type: row.type,
            size: row.size,
            checksum: row.checksum,
            archiveSource: row.archive_source,
            lastModified: row.last_modified,
            tags: JSON.parse(row.tags || '[]'),
            dependencies: JSON.parse(row.dependencies || '[]'),
            tenantId: row.tenant_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }
    
    /**
     * Store performance metrics
     */
    async storePerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
        const connection = this.getActiveConnection();
        
        const query = `
            INSERT INTO performance_metrics (
                metric_id, operation_type, duration_ms, memory_usage_mb,
                cpu_usage_percent, archive_source, asset_count,
                tenant_id, timestamp, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            metrics.metricId,
            metrics.operationType,
            metrics.durationMs,
            metrics.memoryUsageMb,
            metrics.cpuUsagePercent,
            metrics.archiveSource,
            metrics.assetCount,
            metrics.tenantId || 'default',
            metrics.timestamp,
            JSON.stringify(metrics.metadata || {})
        ];
        
        await connection.execute(query, params);
        this.emit('metricsStored', { metricId: metrics.metricId });
    }
    
    /**
     * Get performance analytics
     */
    async getPerformanceAnalytics(criteria: AnalyticsCriteria): Promise<PerformanceAnalytics> {
        const connection = this.getActiveConnection();
        
        const query = `
            SELECT 
                AVG(duration_ms) as avg_duration,
                MIN(duration_ms) as min_duration,
                MAX(duration_ms) as max_duration,
                AVG(memory_usage_mb) as avg_memory,
                MAX(memory_usage_mb) as peak_memory,
                COUNT(*) as operation_count,
                operation_type
            FROM performance_metrics
            WHERE tenant_id = ?
              AND timestamp >= ?
              AND timestamp <= ?
            GROUP BY operation_type
        `;
        
        const results = await connection.query(query, [
            criteria.tenantId || 'default',
            criteria.startDate,
            criteria.endDate
        ]);
        
        return {
            timeRange: { start: criteria.startDate, end: criteria.endDate },
            operationStats: results.map(row => ({
                operationType: row.operation_type,
                averageDuration: row.avg_duration,
                minDuration: row.min_duration,
                maxDuration: row.max_duration,
                averageMemory: row.avg_memory,
                peakMemory: row.peak_memory,
                operationCount: row.operation_count
            })),
            totalOperations: results.reduce((sum, row) => sum + row.operation_count, 0)
        };
    }
    
    /**
     * Setup database schema
     */
    private async setupSchema(): Promise<void> {
        const connection = this.getActiveConnection();
        
        // Asset metadata table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS asset_metadata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_id TEXT NOT NULL,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                type TEXT NOT NULL,
                size INTEGER NOT NULL,
                checksum TEXT,
                archive_source TEXT,
                last_modified TEXT,
                tags TEXT DEFAULT '[]',
                dependencies TEXT DEFAULT '[]',
                tenant_id TEXT NOT NULL DEFAULT 'default',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(asset_id, tenant_id)
            )
        `);
        
        // Performance metrics table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_id TEXT NOT NULL,
                operation_type TEXT NOT NULL,
                duration_ms INTEGER NOT NULL,
                memory_usage_mb REAL,
                cpu_usage_percent REAL,
                archive_source TEXT,
                asset_count INTEGER,
                tenant_id TEXT NOT NULL DEFAULT 'default',
                timestamp TEXT NOT NULL,
                metadata TEXT DEFAULT '{}'
            )
        `);
        
        // User management table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL,
                email TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                permissions TEXT DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_login TEXT
            )
        `);
    }
    
    /**
     * Setup database indices for performance
     */
    private async setupIndices(): Promise<void> {
        const connection = this.getActiveConnection();
        
        // Asset metadata indices
        await connection.execute(`CREATE INDEX IF NOT EXISTS idx_asset_tenant ON asset_metadata(tenant_id)`);
        await connection.execute(`CREATE INDEX IF NOT EXISTS idx_asset_type ON asset_metadata(type)`);
        await connection.execute(`CREATE INDEX IF NOT EXISTS idx_asset_name ON asset_metadata(name)`);
        await connection.execute(`CREATE INDEX IF NOT EXISTS idx_asset_source ON asset_metadata(archive_source)`);
        
        // Performance metrics indices
        await connection.execute(`CREATE INDEX IF NOT EXISTS idx_metrics_tenant ON performance_metrics(tenant_id)`);
        await connection.execute(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON performance_metrics(timestamp)`);
        await connection.execute(`CREATE INDEX IF NOT EXISTS idx_metrics_operation ON performance_metrics(operation_type)`);
    }
    
    private async createConnection(config: DatabaseConfig): Promise<DatabaseConnection> {
        // This would create the actual database connection based on provider
        // For now, return a mock connection interface
        return {
            execute: async (query: string, params?: any[]) => {
                if (this.options.enableQueryLog) {
                    logger.debug('Executing query', { query, params });
                }
                return Promise.resolve();
            },
            query: async (query: string, params?: any[]) => {
                if (this.options.enableQueryLog) {
                    logger.debug('Executing query', { query, params });
                }
                return Promise.resolve([]);
            },
            close: async () => Promise.resolve()
        };
    }
    
    private getActiveConnection(): DatabaseConnection {
        if (!this.activeConnection) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.activeConnection;
    }
}

// Interfaces and types
export interface DatabaseProviderOptions {
    provider?: 'sqlite' | 'postgresql' | 'mysql';
    connectionTimeout?: number;
    poolSize?: number;
    enableQueryLog?: boolean;
    enableMetrics?: boolean;
}

export interface DatabaseConfig {
    provider: 'sqlite' | 'postgresql' | 'mysql';
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    ssl?: boolean;
}

export interface DatabaseConnection {
    execute(query: string, params?: any[]): Promise<void>;
    query(query: string, params?: any[]): Promise<any[]>;
    close(): Promise<void>;
}

export interface AssetMetadata {
    assetId: string;
    name: string;
    path: string;
    type: string;
    size: number;
    checksum?: string;
    archiveSource?: string;
    lastModified?: string;
    tags?: string[];
    dependencies?: string[];
    tenantId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AssetSearchCriteria {
    tenantId?: string;
    name?: string;
    type?: string;
    archiveSource?: string;
    tags?: string[];
    sizeMin?: number;
    sizeMax?: number;
    sortBy?: string;
    sortDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
}

export interface PerformanceMetrics {
    metricId: string;
    operationType: string;
    durationMs: number;
    memoryUsageMb?: number;
    cpuUsagePercent?: number;
    archiveSource?: string;
    assetCount?: number;
    tenantId?: string;
    timestamp: string;
    metadata?: Record<string, any>;
}

export interface AnalyticsCriteria {
    tenantId?: string;
    startDate: string;
    endDate: string;
}

export interface PerformanceAnalytics {
    timeRange: { start: string; end: string };
    operationStats: Array<{
        operationType: string;
        averageDuration: number;
        minDuration: number;
        maxDuration: number;
        averageMemory: number;
        peakMemory: number;
        operationCount: number;
    }>;
    totalOperations: number;
}