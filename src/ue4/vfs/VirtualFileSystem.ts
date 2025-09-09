/**
 * Phase 10: Advanced File Systems - Virtual File System implementation
 * 
 * Provides a unified interface for accessing files from multiple archives
 * with intelligent caching, prioritization, and async loading capabilities.
 */

import { IArchive } from '../../core/IArchive';
import { IFileEntry } from '../../core/IFileEntry';
import { GameFile } from '../pak/GameFile';
import { Collection } from '@discordjs/collection';

/**
 * Priority levels for file loading
 */
export enum LoadPriority {
    LOW = 0,
    NORMAL = 1,
    HIGH = 2,
    CRITICAL = 3
}

/**
 * Cache entry with metadata
 */
export interface ICacheEntry {
    /** Cached file data */
    data: Buffer;
    /** Last access timestamp */
    lastAccess: number;
    /** File size in bytes */
    size: number;
    /** Access count */
    accessCount: number;
    /** Load priority */
    priority: LoadPriority;
}

/**
 * Virtual file mount point
 */
export interface IVirtualMount {
    /** Archive instance */
    archive: IArchive;
    /** Mount path prefix */
    mountPath: string;
    /** Mount priority (higher = preferred) */
    priority: number;
    /** Whether this mount is read-only */
    readOnly: boolean;
}

/**
 * Async loading request
 */
export interface ILoadRequest {
    /** File path to load */
    filePath: string;
    /** Loading priority */
    priority: LoadPriority;
    /** Request timestamp */
    timestamp: number;
    /** Promise resolver */
    resolve: (data: Buffer | null) => void;
    /** Promise rejector */
    reject: (error: Error) => void;
}

/**
 * VFS Configuration options
 */
export interface IVFSConfig {
    /** Maximum cache size in bytes (default: 256MB) */
    maxCacheSize?: number;
    /** Maximum number of cached files (default: 1000) */
    maxCacheEntries?: number;
    /** Enable LRU cache eviction (default: true) */
    enableLRU?: boolean;
    /** Maximum concurrent loads (default: 4) */
    maxConcurrentLoads?: number;
    /** Cache statistics interval in ms (default: 30000) */
    statsInterval?: number;
}

/**
 * Virtual File System for multi-archive support
 * 
 * Features:
 * - Mount multiple archives with priority system
 * - Intelligent LRU caching with size limits
 * - Asynchronous loading with priority queues
 * - File override system for modding
 * - Performance monitoring and statistics
 */
export class VirtualFileSystem {
    private mounts: Collection<string, IVirtualMount> = new Collection();
    private cache: Collection<string, ICacheEntry> = new Collection();
    private loadQueue: ILoadRequest[] = [];
    private activeLoads: Set<string> = new Set();
    private config: Required<IVFSConfig>;
    
    // Statistics
    private stats = {
        cacheHits: 0,
        cacheMisses: 0,
        totalLoads: 0,
        totalCacheSize: 0,
        lastStatsReport: Date.now()
    };

    constructor(config: IVFSConfig = {}) {
        this.config = {
            maxCacheSize: config.maxCacheSize ?? 256 * 1024 * 1024, // 256MB
            maxCacheEntries: config.maxCacheEntries ?? 1000,
            enableLRU: config.enableLRU ?? true,
            maxConcurrentLoads: config.maxConcurrentLoads ?? 4,
            statsInterval: config.statsInterval ?? 30000
        };

        // Start periodic stats reporting
        if (this.config.statsInterval > 0) {
            setInterval(() => this.reportStats(), this.config.statsInterval);
        }
    }

    /**
     * Mount an archive at the specified path
     */
    mount(mountPath: string, archive: IArchive, priority: number = 0, readOnly: boolean = true): void {
        const mount: IVirtualMount = {
            archive,
            mountPath: mountPath.replace(/\\/g, '/'),
            priority,
            readOnly
        };

        this.mounts.set(mountPath, mount);
        
        // Re-sort mounts by priority (higher priority first)
        const sortedMounts = Array.from(this.mounts.entries())
            .sort(([, a], [, b]) => b.priority - a.priority);
        
        this.mounts.clear();
        for (const [path, mount] of sortedMounts) {
            this.mounts.set(path, mount);
        }
    }

    /**
     * Unmount an archive
     */
    unmount(mountPath: string): boolean {
        // Clear cache entries from this mount
        const normalizedPath = mountPath.replace(/\\/g, '/');
        for (const [filePath] of this.cache) {
            if (filePath.startsWith(normalizedPath)) {
                this.removeFromCache(filePath);
            }
        }

        return this.mounts.delete(normalizedPath);
    }

    /**
     * Get file data synchronously (cache only)
     */
    getFileSync(filePath: string): Buffer | null {
        const normalizedPath = this.normalizePath(filePath);
        
        // Check cache first
        const cached = this.cache.get(normalizedPath);
        if (cached) {
            this.stats.cacheHits++;
            cached.lastAccess = Date.now();
            cached.accessCount++;
            return cached.data;
        }

        this.stats.cacheMisses++;
        return null;
    }

    /**
     * Get file data asynchronously with priority support
     */
    async getFileAsync(filePath: string, priority: LoadPriority = LoadPriority.NORMAL): Promise<Buffer | null> {
        const normalizedPath = this.normalizePath(filePath);
        
        // Check cache first
        const cached = this.getFileSync(normalizedPath);
        if (cached) {
            return cached;
        }

        // Check if already loading
        if (this.activeLoads.has(normalizedPath)) {
            // Wait for existing load
            return new Promise((resolve, reject) => {
                this.loadQueue.push({
                    filePath: normalizedPath,
                    priority,
                    timestamp: Date.now(),
                    resolve,
                    reject
                });
            });
        }

        // Start new load
        return this.startLoad(normalizedPath, priority);
    }

    /**
     * Check if file exists in any mounted archive
     */
    fileExists(filePath: string): boolean {
        const normalizedPath = this.normalizePath(filePath);
        
        // Check cache first
        if (this.cache.has(normalizedPath)) {
            return true;
        }

        // Check all mounts
        for (const mount of this.mounts.values()) {
            const relativePath = this.getRelativePath(normalizedPath, mount.mountPath);
            if (relativePath && mount.archive.hasFile(relativePath)) {
                return true;
            }
        }

        return false;
    }

    /**
     * List all files matching pattern
     */
    listFiles(pattern?: RegExp): string[] {
        const allFiles = new Set<string>();

        // Add cached files
        for (const filePath of this.cache.keys()) {
            if (!pattern || pattern.test(filePath)) {
                allFiles.add(filePath);
            }
        }

        // Add files from archives
        for (const mount of this.mounts.values()) {
            try {
                const archiveFiles = mount.archive.getFileList();
                for (const file of archiveFiles) {
                    const fullPath = mount.mountPath + '/' + file;
                    if (!pattern || pattern.test(fullPath)) {
                        allFiles.add(fullPath);
                    }
                }
            } catch (error) {
                // Skip archives that don't support file listing
                continue;
            }
        }

        return Array.from(allFiles).sort();
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        this.stats.totalCacheSize = 0;
    }

    /**
     * Get VFS statistics
     */
    getStats(): typeof this.stats & { cacheEntries: number; mountedArchives: number } {
        return {
            ...this.stats,
            cacheEntries: this.cache.size,
            mountedArchives: this.mounts.size
        };
    }

    // Private methods

    private async startLoad(filePath: string, priority: LoadPriority): Promise<Buffer | null> {
        this.activeLoads.add(filePath);
        this.stats.totalLoads++;

        try {
            // Find the best mount for this file
            const mount = this.findBestMount(filePath);
            if (!mount) {
                return null;
            }

            const relativePath = this.getRelativePath(filePath, mount.mountPath);
            if (!relativePath) {
                return null;
            }

            // Load the file
            const data = await this.loadFromArchive(mount.archive, relativePath);
            if (data) {
                // Add to cache
                this.addToCache(filePath, data, priority);
            }

            // Process any queued requests for this file
            this.processQueuedRequests(filePath, data);

            return data;
        } catch (error) {
            this.processQueuedRequests(filePath, null, error as Error);
            throw error;
        } finally {
            this.activeLoads.delete(filePath);
        }
    }

    private findBestMount(filePath: string): IVirtualMount | null {
        for (const mount of this.mounts.values()) {
            const relativePath = this.getRelativePath(filePath, mount.mountPath);
            if (relativePath && mount.archive.hasFile(relativePath)) {
                return mount;
            }
        }
        return null;
    }

    private async loadFromArchive(archive: IArchive, filePath: string): Promise<Buffer | null> {
        try {
            const file = archive.getFile(filePath);
            if (!file) {
                return null;
            }

            // Simulate async loading for real archives
            return new Promise((resolve) => {
                setTimeout(() => {
                    try {
                        const data = archive.readFile(file);
                        resolve(data);
                    } catch (error) {
                        resolve(null);
                    }
                }, 0);
            });
        } catch (error) {
            return null;
        }
    }

    private addToCache(filePath: string, data: Buffer, priority: LoadPriority): void {
        // Check if we need to evict entries
        if (this.config.enableLRU) {
            this.evictIfNeeded(data.length);
        }

        const entry: ICacheEntry = {
            data,
            lastAccess: Date.now(),
            size: data.length,
            accessCount: 1,
            priority
        };

        this.cache.set(filePath, entry);
        this.stats.totalCacheSize += data.length;
    }

    private evictIfNeeded(newDataSize: number): void {
        // Check size limit
        while (this.stats.totalCacheSize + newDataSize > this.config.maxCacheSize && this.cache.size > 0) {
            this.evictLRUEntry();
        }

        // Check entry count limit
        while (this.cache.size >= this.config.maxCacheEntries) {
            this.evictLRUEntry();
        }
    }

    private evictLRUEntry(): void {
        let oldestEntry: string | null = null;
        let oldestTime = Date.now();

        for (const [filePath, entry] of this.cache) {
            // Prefer lower priority and older access time
            const score = entry.lastAccess - (entry.priority * 3600000); // Priority worth 1 hour
            if (score < oldestTime) {
                oldestTime = score;
                oldestEntry = filePath;
            }
        }

        if (oldestEntry) {
            this.removeFromCache(oldestEntry);
        }
    }

    private removeFromCache(filePath: string): boolean {
        const entry = this.cache.get(filePath);
        if (entry) {
            this.stats.totalCacheSize -= entry.size;
            return this.cache.delete(filePath);
        }
        return false;
    }

    private processQueuedRequests(filePath: string, data: Buffer | null, error?: Error): void {
        const matchingRequests = this.loadQueue.filter(req => req.filePath === filePath);
        this.loadQueue = this.loadQueue.filter(req => req.filePath !== filePath);

        for (const request of matchingRequests) {
            if (error) {
                request.reject(error);
            } else {
                request.resolve(data);
            }
        }
    }

    private normalizePath(filePath: string): string {
        return filePath.replace(/\\/g, '/').toLowerCase();
    }

    private getRelativePath(fullPath: string, mountPath: string): string | null {
        const normalizedFull = this.normalizePath(fullPath);
        const normalizedMount = this.normalizePath(mountPath);

        if (normalizedFull.startsWith(normalizedMount)) {
            return normalizedFull.substring(normalizedMount.length).replace(/^\/+/, '');
        }

        return null;
    }

    private reportStats(): void {
        const now = Date.now();
        const elapsed = now - this.stats.lastStatsReport;
        
        if (elapsed > 0) {
            const hitRate = this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100;
            console.log(`[VFS Stats] Cache Hit Rate: ${hitRate.toFixed(1)}%, ` +
                       `Size: ${(this.stats.totalCacheSize / 1024 / 1024).toFixed(1)}MB, ` +
                       `Entries: ${this.cache.size}, ` +
                       `Active Loads: ${this.activeLoads.size}`);
        }

        this.stats.lastStatsReport = now;
    }
}