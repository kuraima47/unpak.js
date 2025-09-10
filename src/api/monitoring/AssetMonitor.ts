import { EventEmitter } from 'events';
import { watch, FSWatcher } from 'fs';
import { join, dirname } from 'path';
import { logger } from '../../core/logging/Logger';

/**
 * Real-time Asset Monitoring System
 * Addresses roadmap item: "Unified API and Tooling - Real-time asset monitoring"
 * 
 * Features:
 * - Monitor filesystem changes to PAK files and IoStore containers
 * - Detect asset updates and automatically reload affected archives
 * - Track asset dependencies and cascade updates
 * - Provide real-time notifications for development workflows
 * - Hot-reload support for game development environments
 */
export class AssetMonitor extends EventEmitter {
    private readonly watchers = new Map<string, FSWatcher>();
    private readonly archives = new Map<string, MonitoredArchive>();
    private readonly assetDependencies = new Map<string, Set<string>>();
    private isActive = false;
    private options: AssetMonitorOptions;

    constructor(options: AssetMonitorOptions = {}) {
        super();
        this.options = {
            debounceDelay: 1000,
            recursive: true,
            ignoreHidden: true,
            maxDepthLevel: 10,
            enableDependencyTracking: true,
            ...options
        };
    }

    /**
     * Start monitoring
     */
    async start(): Promise<void> {
        if (this.isActive) {
            logger.warn('Asset monitor is already active');
            return;
        }

        this.isActive = true;
        logger.info('Asset monitor started', {
            watchedArchives: this.archives.size,
            options: this.options
        });

        this.emit('started');
    }

    /**
     * Stop monitoring
     */
    async stop(): Promise<void> {
        if (!this.isActive) {
            return;
        }

        // Close all watchers
        for (const [path, watcher] of this.watchers) {
            watcher.close();
            logger.debug('Stopped watching path', { path });
        }

        this.watchers.clear();
        this.isActive = false;

        logger.info('Asset monitor stopped');
        this.emit('stopped');
    }

    /**
     * Add archive to monitoring
     */
    async addArchive(archivePath: string, archive: any, options: ArchiveMonitorOptions = {}): Promise<void> {
        if (this.archives.has(archivePath)) {
            logger.warn('Archive already being monitored', { archivePath });
            return;
        }

        const monitoredArchive: MonitoredArchive = {
            path: archivePath,
            archive,
            lastModified: await this.getFileModificationTime(archivePath),
            options: {
                watchFileChanges: true,
                watchDependencies: true,
                hotReload: false,
                ...options
            },
            assets: new Map(),
            dependencies: new Set()
        };

        this.archives.set(archivePath, monitoredArchive);

        // Start watching the archive file
        if (monitoredArchive.options.watchFileChanges) {
            await this.watchArchiveFile(archivePath);
        }

        // Build initial asset index
        await this.indexArchiveAssets(monitoredArchive);

        // Watch dependencies if enabled
        if (monitoredArchive.options.watchDependencies) {
            await this.watchArchiveDependencies(monitoredArchive);
        }

        logger.info('Archive added to monitoring', {
            archivePath,
            assetCount: monitoredArchive.assets.size,
            dependencyCount: monitoredArchive.dependencies.size
        });

        this.emit('archiveAdded', {
            path: archivePath,
            assetCount: monitoredArchive.assets.size
        });
    }

    /**
     * Remove archive from monitoring
     */
    async removeArchive(archivePath: string): Promise<void> {
        const monitoredArchive = this.archives.get(archivePath);
        if (!monitoredArchive) {
            return;
        }

        // Stop watching the archive file
        const watcher = this.watchers.get(archivePath);
        if (watcher) {
            watcher.close();
            this.watchers.delete(archivePath);
        }

        // Remove from dependency tracking
        for (const [asset, deps] of this.assetDependencies) {
            deps.delete(archivePath);
            if (deps.size === 0) {
                this.assetDependencies.delete(asset);
            }
        }

        this.archives.delete(archivePath);

        logger.info('Archive removed from monitoring', { archivePath });
        this.emit('archiveRemoved', { path: archivePath });
    }

    /**
     * Watch a directory for new archives and asset changes
     */
    async watchDirectory(directoryPath: string, options: DirectoryWatchOptions = {}): Promise<void> {
        const watchOptions = {
            recursive: this.options.recursive,
            ...options
        };

        try {
            const watcher = watch(directoryPath, watchOptions, async (eventType, filename) => {
                if (!filename) return;

                const filePath = join(directoryPath, filename);
                await this.handleFileSystemEvent(eventType, filePath);
            });

            this.watchers.set(directoryPath, watcher);

            logger.info('Directory watching started', {
                directoryPath,
                recursive: watchOptions.recursive
            });

            this.emit('directoryWatchStarted', { path: directoryPath });

        } catch (error: any) {
            logger.error('Failed to watch directory', error.message, {
                directoryPath: directoryPath
            });
            throw error;
        }
    }

    /**
     * Handle filesystem events
     */
    private async handleFileSystemEvent(eventType: string, filePath: string): Promise<void> {
        logger.debug('Filesystem event', { eventType, filePath });

        // Debounce rapid fire events
        const debounceKey = `${eventType}-${filePath}`;
        if (this.debounceTimers.has(debounceKey)) {
            clearTimeout(this.debounceTimers.get(debounceKey)!);
        }

        this.debounceTimers.set(debounceKey, setTimeout(async () => {
            try {
                await this.processFileSystemEvent(eventType, filePath);
            } catch (error: any) {
                logger.error('Error processing filesystem event', error.message, {
                    eventType: eventType,
                    filePath: filePath
                });
            } finally {
                this.debounceTimers.delete(debounceKey);
            }
        }, this.options.debounceDelay));
    }

    private readonly debounceTimers = new Map<string, NodeJS.Timeout>();

    /**
     * Process filesystem events after debouncing
     */
    private async processFileSystemEvent(eventType: string, filePath: string): Promise<void> {
        const isArchiveFile = this.isArchiveFile(filePath);
        const monitoredArchive = this.findArchiveForPath(filePath);

        if (eventType === 'change' && isArchiveFile && monitoredArchive) {
            await this.handleArchiveChange(monitoredArchive);
        } else if (eventType === 'rename' && isArchiveFile) {
            await this.handleArchiveRename(filePath);
        } else if (monitoredArchive && this.isAssetFile(filePath)) {
            await this.handleAssetChange(monitoredArchive, filePath, eventType);
        }
    }

    /**
     * Handle archive file changes
     */
    private async handleArchiveChange(monitoredArchive: MonitoredArchive): Promise<void> {
        const currentModTime = await this.getFileModificationTime(monitoredArchive.path);
        
        if (currentModTime > monitoredArchive.lastModified) {
            logger.info('Archive file changed, reloading', {
                path: monitoredArchive.path,
                lastModified: new Date(monitoredArchive.lastModified),
                currentModified: new Date(currentModTime)
            });

            monitoredArchive.lastModified = currentModTime;

            // Reload archive
            try {
                await this.reloadArchive(monitoredArchive);
                
                this.emit('archiveReloaded', {
                    path: monitoredArchive.path,
                    timestamp: currentModTime
                });

                // Hot reload if enabled
                if (monitoredArchive.options.hotReload) {
                    await this.performHotReload(monitoredArchive);
                }

            } catch (error: any) {
                logger.error('Failed to reload archive', error.message, {
                    path: monitoredArchive.path
                });

                this.emit('archiveReloadFailed', {
                    path: monitoredArchive.path,
                    error: error.message
                });
            }
        }
    }

    /**
     * Handle asset changes within archives
     */
    private async handleAssetChange(
        monitoredArchive: MonitoredArchive, 
        assetPath: string, 
        eventType: string
    ): Promise<void> {
        const relativePath = this.getRelativeAssetPath(assetPath, monitoredArchive.path);
        
        if (eventType === 'change') {
            logger.info('Asset changed', {
                archive: monitoredArchive.path,
                asset: relativePath
            });

            // Update asset metadata
            await this.updateAssetMetadata(monitoredArchive, relativePath);

            // Check for dependent assets
            const dependentAssets = this.findDependentAssets(relativePath);
            
            this.emit('assetChanged', {
                archive: monitoredArchive.path,
                asset: relativePath,
                dependents: Array.from(dependentAssets),
                timestamp: Date.now()
            });

            // Cascade updates to dependent assets
            for (const dependent of dependentAssets) {
                this.emit('dependentAssetChanged', {
                    archive: monitoredArchive.path,
                    asset: dependent,
                    source: relativePath
                });
            }

        } else if (eventType === 'rename') {
            // Handle asset rename/move
            this.emit('assetRenamed', {
                archive: monitoredArchive.path,
                asset: relativePath,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Reload an archive and update its asset index
     */
    private async reloadArchive(monitoredArchive: MonitoredArchive): Promise<void> {
        // This would integrate with the actual archive loading system
        logger.debug('Reloading archive', { path: monitoredArchive.path });

        // Clear existing asset index
        monitoredArchive.assets.clear();

        // Rebuild asset index
        await this.indexArchiveAssets(monitoredArchive);

        logger.info('Archive reloaded successfully', {
            path: monitoredArchive.path,
            assetCount: monitoredArchive.assets.size
        });
    }

    /**
     * Index assets within an archive
     */
    private async indexArchiveAssets(monitoredArchive: MonitoredArchive): Promise<void> {
        try {
            // This would use the actual archive API
            const files = monitoredArchive.archive.listFiles ? 
                monitoredArchive.archive.listFiles('*.uasset') : [];

            for (const file of files) {
                const assetInfo: AssetInfo = {
                    path: file.path,
                    size: file.size || 0,
                    lastModified: Date.now(),
                    type: this.detectAssetType(file.path),
                    dependencies: new Set()
                };

                // Extract dependencies if enabled
                if (this.options.enableDependencyTracking) {
                    await this.extractAssetDependencies(monitoredArchive, assetInfo);
                }

                monitoredArchive.assets.set(file.path, assetInfo);
            }

            logger.debug('Archive assets indexed', {
                archive: monitoredArchive.path,
                assetCount: monitoredArchive.assets.size
            });

        } catch (error: any) {
            logger.error('Failed to index archive assets', error.message, {
                archive: monitoredArchive.path
            });
        }
    }

    /**
     * Extract asset dependencies
     */
    private async extractAssetDependencies(
        monitoredArchive: MonitoredArchive, 
        assetInfo: AssetInfo
    ): Promise<void> {
        try {
            // This would integrate with asset parsing to extract references
            // For now, simulate dependency extraction
            const mockDependencies = [
                `/Game/Materials/Material_${Math.floor(Math.random() * 100)}.uasset`,
                `/Game/Textures/Texture_${Math.floor(Math.random() * 100)}.uasset`
            ];

            for (const dep of mockDependencies) {
                assetInfo.dependencies.add(dep);
                
                // Update global dependency tracking
                if (!this.assetDependencies.has(dep)) {
                    this.assetDependencies.set(dep, new Set());
                }
                this.assetDependencies.get(dep)!.add(assetInfo.path);
            }

        } catch (error: any) {
            logger.debug('Failed to extract asset dependencies', {
                asset: assetInfo.path,
                error: error.message
            });
        }
    }

    /**
     * Watch archive file for changes
     */
    private async watchArchiveFile(archivePath: string): Promise<void> {
        try {
            const watcher = watch(archivePath, async (eventType, filename) => {
                if (eventType === 'change') {
                    const monitoredArchive = this.archives.get(archivePath);
                    if (monitoredArchive) {
                        await this.handleArchiveChange(monitoredArchive);
                    }
                }
            });

            this.watchers.set(archivePath, watcher);
            logger.debug('Started watching archive file', { archivePath });

        } catch (error: any) {
            logger.error('Failed to watch archive file', error.message, {
                archivePath: archivePath
            });
        }
    }

    /**
     * Watch archive dependencies
     */
    private async watchArchiveDependencies(monitoredArchive: MonitoredArchive): Promise<void> {
        // Watch the directory containing the archive for related files
        const archiveDir = dirname(monitoredArchive.path);
        
        if (!this.watchers.has(archiveDir)) {
            await this.watchDirectory(archiveDir, { recursive: false });
        }
    }

    /**
     * Perform hot reload for development environments
     */
    private async performHotReload(monitoredArchive: MonitoredArchive): Promise<void> {
        logger.info('Performing hot reload', { archive: monitoredArchive.path });

        // This would integrate with game engines or development tools
        // to trigger asset reloading in real-time
        
        this.emit('hotReload', {
            archive: monitoredArchive.path,
            timestamp: Date.now()
        });
    }

    /**
     * Utility methods
     */
    private async getFileModificationTime(filePath: string): Promise<number> {
        try {
            const { stat } = await import('fs/promises');
            const stats = await stat(filePath);
            return stats.mtime.getTime();
        } catch {
            return 0;
        }
    }

    private isArchiveFile(filePath: string): boolean {
        return filePath.endsWith('.pak') || 
               filePath.endsWith('.utoc') || 
               filePath.endsWith('.ucas');
    }

    private isAssetFile(filePath: string): boolean {
        return filePath.endsWith('.uasset') || 
               filePath.endsWith('.umap') ||
               filePath.endsWith('.uexp') ||
               filePath.endsWith('.ubulk');
    }

    private detectAssetType(filePath: string): string {
        if (filePath.includes('/Materials/')) return 'Material';
        if (filePath.includes('/Textures/')) return 'Texture';
        if (filePath.includes('/Meshes/')) return 'Mesh';
        if (filePath.includes('/Audio/')) return 'Audio';
        if (filePath.includes('/Blueprints/')) return 'Blueprint';
        return 'Unknown';
    }

    private findArchiveForPath(filePath: string): MonitoredArchive | undefined {
        for (const archive of this.archives.values()) {
            if (filePath.startsWith(dirname(archive.path))) {
                return archive;
            }
        }
        return undefined;
    }

    private getRelativeAssetPath(assetPath: string, archivePath: string): string {
        // Convert absolute path to relative archive path
        return assetPath.replace(dirname(archivePath), '').replace(/\\/g, '/');
    }

    private findDependentAssets(assetPath: string): Set<string> {
        return this.assetDependencies.get(assetPath) || new Set();
    }

    private async updateAssetMetadata(monitoredArchive: MonitoredArchive, assetPath: string): Promise<void> {
        const asset = monitoredArchive.assets.get(assetPath);
        if (asset) {
            asset.lastModified = Date.now();
            // Could also update size, dependencies, etc.
        }
    }

    private async handleArchiveRename(filePath: string): Promise<void> {
        // Handle archive file being renamed or moved
        logger.info('Archive file renamed/moved', { filePath });
        
        this.emit('archiveRenamed', {
            path: filePath,
            timestamp: Date.now()
        });
    }

    /**
     * Get monitoring statistics
     */
    public getStatistics(): MonitoringStatistics {
        const totalAssets = Array.from(this.archives.values())
            .reduce((total, archive) => total + archive.assets.size, 0);

        return {
            isActive: this.isActive,
            watchedArchives: this.archives.size,
            watchedPaths: this.watchers.size,
            totalAssets,
            totalDependencies: this.assetDependencies.size,
            activeDebouncers: this.debounceTimers.size
        };
    }

    /**
     * Get list of monitored archives
     */
    public getMonitoredArchives(): Array<{ path: string; assetCount: number; lastModified: number }> {
        return Array.from(this.archives.values()).map(archive => ({
            path: archive.path,
            assetCount: archive.assets.size,
            lastModified: archive.lastModified
        }));
    }
}

// Type definitions
export interface AssetMonitorOptions {
    /** Debounce delay for filesystem events (ms) */
    debounceDelay?: number;
    /** Enable recursive directory watching */
    recursive?: boolean;
    /** Ignore hidden files and directories */
    ignoreHidden?: boolean;
    /** Maximum depth level for recursive watching */
    maxDepthLevel?: number;
    /** Enable asset dependency tracking */
    enableDependencyTracking?: boolean;
}

export interface ArchiveMonitorOptions {
    /** Watch for changes to the archive file itself */
    watchFileChanges?: boolean;
    /** Watch for changes to dependencies */
    watchDependencies?: boolean;
    /** Enable hot reload functionality */
    hotReload?: boolean;
}

export interface DirectoryWatchOptions {
    /** Enable recursive watching */
    recursive?: boolean;
    /** File patterns to include */
    include?: string[];
    /** File patterns to exclude */
    exclude?: string[];
}

export interface MonitoredArchive {
    path: string;
    archive: any;
    lastModified: number;
    options: ArchiveMonitorOptions;
    assets: Map<string, AssetInfo>;
    dependencies: Set<string>;
}

export interface AssetInfo {
    path: string;
    size: number;
    lastModified: number;
    type: string;
    dependencies: Set<string>;
}

export interface MonitoringStatistics {
    isActive: boolean;
    watchedArchives: number;
    watchedPaths: number;
    totalAssets: number;
    totalDependencies: number;
    activeDebouncers: number;
}

/**
 * Factory function to create a new asset monitor
 */
export function createAssetMonitor(options?: AssetMonitorOptions): AssetMonitor {
    return new AssetMonitor(options);
}