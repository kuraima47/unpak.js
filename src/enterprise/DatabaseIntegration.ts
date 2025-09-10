import { EventEmitter } from 'events';

/**
 * Database Integration for unpak.js Enterprise Features
 * Phase 12 - Database integration for asset metadata, performance metrics, and enterprise features
 *
 * This module provides:
 * - Asset metadata storage and search
 * - Performance metrics tracking
 * - Dependency mapping
 * - Asset usage analytics
 * - Multi-tenant data isolation
 */

export interface IAssetMetadata {
  assetId: string;
  name: string;
  path: string;
  type: string;
  size: number;
  checksum: string;
  archiveSource: string;
  tags: string[];
  dependencies: string[];
  tenantId: string;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  metadata?: Record<string, any>;
}

export interface IPerformanceMetrics {
  metricId: string;
  operationType:
    | 'archive_loading'
    | 'asset_extraction'
    | 'conversion'
    | 'search'
    | 'archive_processing';
  durationMs: number;
  memoryUsageMb: number;
  cpuUsagePercent?: number;
  assetsProcessed?: number;
  tenantId: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
}

export interface IAssetSearchOptions {
  tenantId: string;
  type?: string;
  tags?: string[];
  namePattern?: string;
  pathPattern?: string;
  sizeMin?: number;
  sizeMax?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy?: 'name' | 'size' | 'created' | 'accessed' | 'type';
  sortDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface IAnalyticsQuery {
  tenantId: string;
  startDate: Date;
  endDate: Date;
  operationType?: string;
  groupBy?: 'day' | 'hour' | 'operation' | 'tenant';
}

export interface IAnalyticsResult {
  operationStats: Array<{
    operationType: string;
    count: number;
    averageDuration: number;
    totalDuration: number;
    successRate: number;
  }>;
  timeSeriesData: Array<{
    timestamp: string;
    operationCount: number;
    averageDuration: number;
    memoryUsage: number;
  }>;
  assetTypeDistribution: Array<{
    type: string;
    count: number;
    totalSize: number;
  }>;
}

/**
 * Abstract database provider interface
 * Implementations can use SQLite, PostgreSQL, MongoDB, etc.
 */
export abstract class DatabaseProvider extends EventEmitter {
  abstract initialize(): Promise<void>;
  abstract close(): Promise<void>;
  abstract isHealthy(): Promise<boolean>;

  // Asset metadata operations
  abstract storeAssetMetadata(metadata: IAssetMetadata): Promise<string>;
  abstract getAssetMetadata(assetId: string, tenantId: string): Promise<IAssetMetadata | null>;
  abstract updateAssetMetadata(
    assetId: string,
    tenantId: string,
    updates: Partial<IAssetMetadata>,
  ): Promise<boolean>;
  abstract deleteAssetMetadata(assetId: string, tenantId: string): Promise<boolean>;
  abstract searchAssets(options: IAssetSearchOptions): Promise<IAssetMetadata[]>;

  // Performance metrics operations
  abstract storePerformanceMetrics(metrics: IPerformanceMetrics): Promise<string>;
  abstract getPerformanceMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IPerformanceMetrics[]>;
  abstract getAnalytics(query: IAnalyticsQuery): Promise<IAnalyticsResult>;

  // Dependency operations
  abstract storeDependency(assetId: string, dependencyId: string, tenantId: string): Promise<void>;
  abstract getDependencies(assetId: string, tenantId: string): Promise<string[]>;
  abstract getDependents(assetId: string, tenantId: string): Promise<string[]>;
  abstract deleteDependencies(assetId: string, tenantId: string): Promise<void>;

  // Batch operations
  abstract batchStoreAssets(assets: IAssetMetadata[]): Promise<string[]>;
  abstract batchDeleteAssets(assetIds: string[], tenantId: string): Promise<number>;

  // Tenant management
  abstract createTenantSchema(tenantId: string): Promise<void>;
  abstract deleteTenantData(tenantId: string): Promise<void>;
  abstract getTenantStats(tenantId: string): Promise<{
    assetCount: number;
    totalSize: number;
    lastActivity: Date;
  }>;
}

/**
 * In-memory database provider for development and testing
 * Production should use SQLite, PostgreSQL, or other persistent storage
 */
export class InMemoryDatabaseProvider extends DatabaseProvider {
  private assets: Map<string, IAssetMetadata> = new Map();
  private metrics: IPerformanceMetrics[] = [];
  private dependencies: Map<string, Set<string>> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
    this.emit('initialized');
  }

  async close(): Promise<void> {
    this.assets.clear();
    this.metrics.length = 0;
    this.dependencies.clear();
    this.initialized = false;
    this.emit('closed');
  }

  async isHealthy(): Promise<boolean> {
    return this.initialized;
  }

  private getAssetKey(assetId: string, tenantId: string): string {
    return `${tenantId}:${assetId}`;
  }

  async storeAssetMetadata(metadata: IAssetMetadata): Promise<string> {
    const key = this.getAssetKey(metadata.assetId, metadata.tenantId);
    this.assets.set(key, {
      ...metadata,
      createdAt: metadata.createdAt || new Date(),
      lastAccessed: new Date(),
      accessCount: metadata.accessCount || 0,
    });
    return metadata.assetId;
  }

  async getAssetMetadata(assetId: string, tenantId: string): Promise<IAssetMetadata | null> {
    const key = this.getAssetKey(assetId, tenantId);
    const asset = this.assets.get(key);
    if (asset) {
      // Update last accessed
      asset.lastAccessed = new Date();
      asset.accessCount = (asset.accessCount || 0) + 1;
    }
    return asset || null;
  }

  async updateAssetMetadata(
    assetId: string,
    tenantId: string,
    updates: Partial<IAssetMetadata>,
  ): Promise<boolean> {
    const key = this.getAssetKey(assetId, tenantId);
    const existing = this.assets.get(key);
    if (existing) {
      this.assets.set(key, { ...existing, ...updates });
      return true;
    }
    return false;
  }

  async deleteAssetMetadata(assetId: string, tenantId: string): Promise<boolean> {
    const key = this.getAssetKey(assetId, tenantId);
    const deleted = this.assets.delete(key);
    if (deleted) {
      await this.deleteDependencies(assetId, tenantId);
    }
    return deleted;
  }

  async searchAssets(options: IAssetSearchOptions): Promise<IAssetMetadata[]> {
    let results = Array.from(this.assets.values()).filter(
      asset => asset.tenantId === options.tenantId,
    );

    // Apply filters
    if (options.type) {
      results = results.filter(asset => asset.type === options.type);
    }
    if (options.tags && options.tags.length > 0) {
      results = results.filter(asset => options.tags!.some(tag => asset.tags.includes(tag)));
    }
    if (options.namePattern) {
      const pattern = new RegExp(options.namePattern, 'i');
      results = results.filter(asset => pattern.test(asset.name));
    }
    if (options.pathPattern) {
      const pattern = new RegExp(options.pathPattern, 'i');
      results = results.filter(asset => pattern.test(asset.path));
    }
    if (options.sizeMin !== undefined) {
      results = results.filter(asset => asset.size >= options.sizeMin!);
    }
    if (options.sizeMax !== undefined) {
      results = results.filter(asset => asset.size <= options.sizeMax!);
    }
    if (options.createdAfter) {
      results = results.filter(asset => asset.createdAt >= options.createdAfter!);
    }
    if (options.createdBefore) {
      results = results.filter(asset => asset.createdAt <= options.createdBefore!);
    }

    // Apply sorting
    if (options.sortBy) {
      const direction = options.sortDirection === 'DESC' ? -1 : 1;
      results.sort((a, b) => {
        let aVal: any, bVal: any;
        switch (options.sortBy) {
          case 'name':
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case 'size':
            aVal = a.size;
            bVal = b.size;
            break;
          case 'created':
            aVal = a.createdAt.getTime();
            bVal = b.createdAt.getTime();
            break;
          case 'accessed':
            aVal = a.lastAccessed.getTime();
            bVal = b.lastAccessed.getTime();
            break;
          case 'type':
            aVal = a.type.toLowerCase();
            bVal = b.type.toLowerCase();
            break;
          default:
            return 0;
        }
        return aVal < bVal ? -direction : aVal > bVal ? direction : 0;
      });
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    return results.slice(offset, offset + limit);
  }

  async storePerformanceMetrics(metrics: IPerformanceMetrics): Promise<string> {
    this.metrics.push(metrics);
    return metrics.metricId;
  }

  async getPerformanceMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IPerformanceMetrics[]> {
    return this.metrics.filter(
      metric =>
        metric.tenantId === tenantId &&
        new Date(metric.timestamp) >= startDate &&
        new Date(metric.timestamp) <= endDate,
    );
  }

  async getAnalytics(query: IAnalyticsQuery): Promise<IAnalyticsResult> {
    const metrics = await this.getPerformanceMetrics(
      query.tenantId,
      query.startDate,
      query.endDate,
    );

    // Operation statistics
    const operationMap = new Map<
      string,
      {
        count: number;
        totalDuration: number;
        successCount: number;
      }
    >();

    metrics.forEach(metric => {
      const key = metric.operationType;
      const existing = operationMap.get(key) || { count: 0, totalDuration: 0, successCount: 0 };
      existing.count++;
      existing.totalDuration += metric.durationMs;
      if (metric.success) existing.successCount++;
      operationMap.set(key, existing);
    });

    const operationStats = Array.from(operationMap.entries()).map(([operationType, stats]) => ({
      operationType,
      count: stats.count,
      averageDuration: stats.count > 0 ? stats.totalDuration / stats.count : 0,
      totalDuration: stats.totalDuration,
      successRate: stats.count > 0 ? stats.successCount / stats.count : 0,
    }));

    // Time series data (simplified - group by hour)
    const timeSeriesMap = new Map<
      string,
      {
        operationCount: number;
        totalDuration: number;
        memoryUsage: number;
      }
    >();

    metrics.forEach(metric => {
      const hour = new Date(metric.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();

      const existing = timeSeriesMap.get(key) || {
        operationCount: 0,
        totalDuration: 0,
        memoryUsage: 0,
      };
      existing.operationCount++;
      existing.totalDuration += metric.durationMs;
      existing.memoryUsage = Math.max(existing.memoryUsage, metric.memoryUsageMb);
      timeSeriesMap.set(key, existing);
    });

    const timeSeriesData = Array.from(timeSeriesMap.entries()).map(([timestamp, stats]) => ({
      timestamp,
      operationCount: stats.operationCount,
      averageDuration: stats.operationCount > 0 ? stats.totalDuration / stats.operationCount : 0,
      memoryUsage: stats.memoryUsage,
    }));

    // Asset type distribution
    const assetTypes = Array.from(this.assets.values()).filter(
      asset => asset.tenantId === query.tenantId,
    );

    const typeMap = new Map<string, { count: number; totalSize: number }>();
    assetTypes.forEach(asset => {
      const existing = typeMap.get(asset.type) || { count: 0, totalSize: 0 };
      existing.count++;
      existing.totalSize += asset.size;
      typeMap.set(asset.type, existing);
    });

    const assetTypeDistribution = Array.from(typeMap.entries()).map(([type, stats]) => ({
      type,
      count: stats.count,
      totalSize: stats.totalSize,
    }));

    return {
      operationStats,
      timeSeriesData,
      assetTypeDistribution,
    };
  }

  async storeDependency(assetId: string, dependencyId: string, tenantId: string): Promise<void> {
    const key = this.getAssetKey(assetId, tenantId);
    if (!this.dependencies.has(key)) {
      this.dependencies.set(key, new Set());
    }
    this.dependencies.get(key)!.add(dependencyId);
  }

  async getDependencies(assetId: string, tenantId: string): Promise<string[]> {
    const key = this.getAssetKey(assetId, tenantId);
    const deps = this.dependencies.get(key);
    return deps ? Array.from(deps) : [];
  }

  async getDependents(assetId: string, tenantId: string): Promise<string[]> {
    const dependents: string[] = [];
    for (const [key, deps] of this.dependencies.entries()) {
      if (key.startsWith(tenantId + ':') && deps.has(assetId)) {
        const dependentId = key.substring(tenantId.length + 1);
        dependents.push(dependentId);
      }
    }
    return dependents;
  }

  async deleteDependencies(assetId: string, tenantId: string): Promise<void> {
    const key = this.getAssetKey(assetId, tenantId);
    this.dependencies.delete(key);
  }

  async batchStoreAssets(assets: IAssetMetadata[]): Promise<string[]> {
    const results: string[] = [];
    for (const asset of assets) {
      const id = await this.storeAssetMetadata(asset);
      results.push(id);
    }
    return results;
  }

  async batchDeleteAssets(assetIds: string[], tenantId: string): Promise<number> {
    let deleted = 0;
    for (const assetId of assetIds) {
      if (await this.deleteAssetMetadata(assetId, tenantId)) {
        deleted++;
      }
    }
    return deleted;
  }

  async createTenantSchema(tenantId: string): Promise<void> {
    // In-memory provider doesn't need schema creation
    this.emit('tenantCreated', tenantId);
  }

  async deleteTenantData(tenantId: string): Promise<void> {
    // Delete all assets for this tenant
    const keysToDelete = Array.from(this.assets.keys()).filter(key =>
      key.startsWith(tenantId + ':'),
    );
    keysToDelete.forEach(key => this.assets.delete(key));

    // Delete all metrics for this tenant
    this.metrics = this.metrics.filter(metric => metric.tenantId !== tenantId);

    // Delete all dependencies for this tenant
    const depKeysToDelete = Array.from(this.dependencies.keys()).filter(key =>
      key.startsWith(tenantId + ':'),
    );
    depKeysToDelete.forEach(key => this.dependencies.delete(key));

    this.emit('tenantDeleted', tenantId);
  }

  async getTenantStats(tenantId: string): Promise<{
    assetCount: number;
    totalSize: number;
    lastActivity: Date;
  }> {
    const assets = Array.from(this.assets.values()).filter(asset => asset.tenantId === tenantId);
    const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
    const lastActivity = assets.reduce((latest, asset) => {
      return asset.lastAccessed > latest ? asset.lastAccessed : latest;
    }, new Date(0));

    return {
      assetCount: assets.length,
      totalSize,
      lastActivity,
    };
  }
}

/**
 * Main database integration manager
 * Provides high-level interface for database operations
 */
export class DatabaseIntegration extends EventEmitter {
  private provider: DatabaseProvider;
  private initialized = false;

  constructor(provider: DatabaseProvider) {
    super();
    this.provider = provider;

    // Forward provider events
    this.provider.on('initialized', () => this.emit('initialized'));
    this.provider.on('closed', () => this.emit('closed'));
    this.provider.on('error', error => this.emit('error', error));
  }

  async initialize(): Promise<void> {
    await this.provider.initialize();
    this.initialized = true;
  }

  async close(): Promise<void> {
    await this.provider.close();
    this.initialized = false;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async isHealthy(): Promise<boolean> {
    return this.provider.isHealthy();
  }

  // Expose provider methods with validation
  async storeAssetMetadata(metadata: IAssetMetadata): Promise<string> {
    this.ensureInitialized();
    return this.provider.storeAssetMetadata(metadata);
  }

  async getAssetMetadata(assetId: string, tenantId: string): Promise<IAssetMetadata | null> {
    this.ensureInitialized();
    return this.provider.getAssetMetadata(assetId, tenantId);
  }

  async searchAssets(options: IAssetSearchOptions): Promise<IAssetMetadata[]> {
    this.ensureInitialized();
    return this.provider.searchAssets(options);
  }

  async storePerformanceMetrics(metrics: IPerformanceMetrics): Promise<string> {
    this.ensureInitialized();
    return this.provider.storePerformanceMetrics(metrics);
  }

  async getAnalytics(query: IAnalyticsQuery): Promise<IAnalyticsResult> {
    this.ensureInitialized();
    return this.provider.getAnalytics(query);
  }

  async storeDependency(assetId: string, dependencyId: string, tenantId: string): Promise<void> {
    this.ensureInitialized();
    return this.provider.storeDependency(assetId, dependencyId, tenantId);
  }

  async getDependencies(assetId: string, tenantId: string): Promise<string[]> {
    this.ensureInitialized();
    return this.provider.getDependencies(assetId, tenantId);
  }

  async createTenantSchema(tenantId: string): Promise<void> {
    this.ensureInitialized();
    return this.provider.createTenantSchema(tenantId);
  }

  async deleteTenantData(tenantId: string): Promise<void> {
    this.ensureInitialized();
    return this.provider.deleteTenantData(tenantId);
  }

  async getTenantStats(tenantId: string): Promise<{
    assetCount: number;
    totalSize: number;
    lastActivity: Date;
  }> {
    this.ensureInitialized();
    return this.provider.getTenantStats(tenantId);
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Database integration not initialized');
    }
  }
}

/**
 * Factory function for creating database integration with different providers
 */
export function createDatabaseIntegration(
  type: 'memory' | 'sqlite' | 'postgresql' = 'memory',
): DatabaseIntegration {
  let provider: DatabaseProvider;

  switch (type) {
    case 'memory':
      provider = new InMemoryDatabaseProvider();
      break;
    case 'sqlite':
      // TODO: Implement SQLite provider
      throw new Error('SQLite provider not yet implemented');
    case 'postgresql':
      // TODO: Implement PostgreSQL provider
      throw new Error('PostgreSQL provider not yet implemented');
    default:
      throw new Error(`Unknown database provider type: ${type}`);
  }

  return new DatabaseIntegration(provider);
}
