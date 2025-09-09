/**
 * Phase 9: Plugin and Modding Framework - Dynamic Plugin System
 * 
 * Provides a framework for loading and managing plugins dynamically,
 * supporting mod overrides, asset patching, and extensibility.
 */

import { EventEmitter } from 'events';
import { VirtualFileSystem } from '../vfs/VirtualFileSystem';

/**
 * Plugin metadata interface
 */
export interface IPluginMetadata {
    /** Plugin unique identifier */
    id: string;
    
    /** Plugin name */
    name: string;
    
    /** Plugin version */
    version: string;
    
    /** Plugin description */
    description: string;
    
    /** Plugin author */
    author: string;
    
    /** Supported unpak.js version */
    unpackVersion: string;
    
    /** Plugin dependencies */
    dependencies?: string[];
    
    /** Plugin type */
    type: 'converter' | 'archive' | 'game_support' | 'utility' | 'mod';
    
    /** Plugin priority (higher = loaded first) */
    priority?: number;
    
    /** Entry point file */
    entryPoint: string;
    
    /** Plugin configuration schema */
    configSchema?: Record<string, any>;
    
    /** Supported file extensions */
    supportedExtensions?: string[];
    
    /** Game compatibility */
    gameCompatibility?: string[];
}

/**
 * Plugin interface that all plugins must implement
 */
export interface IPlugin {
    /** Plugin metadata */
    metadata: IPluginMetadata;
    
    /** Initialize the plugin */
    initialize(context: IPluginContext): Promise<void>;
    
    /** Cleanup plugin resources */
    cleanup(): Promise<void>;
    
    /** Get plugin configuration */
    getConfig(): Record<string, any>;
    
    /** Update plugin configuration */
    setConfig(config: Record<string, any>): void;
}

/**
 * Plugin context provided to plugins
 */
export interface IPluginContext {
    /** Virtual file system instance */
    vfs: VirtualFileSystem;
    
    /** Plugin manager instance */
    pluginManager: PluginManager;
    
    /** Logger instance */
    logger: IPluginLogger;
    
    /** Event emitter for plugin communication */
    eventBus: EventEmitter;
    
    /** Plugin configuration */
    config: Record<string, any>;
    
    /** API for registering hooks and handlers */
    api: IPluginAPI;
}

/**
 * Plugin logger interface
 */
export interface IPluginLogger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}

/**
 * Plugin API for registering handlers and hooks
 */
export interface IPluginAPI {
    /** Register a file converter */
    registerConverter(extension: string, converter: IFileConverter): void;
    
    /** Register an archive handler */
    registerArchiveHandler(type: string, handler: IArchiveHandler): void;
    
    /** Register a mod override */
    registerModOverride(pattern: string, handler: IModOverride): void;
    
    /** Register an asset patch */
    registerAssetPatch(assetPath: string, patch: IAssetPatch): void;
    
    /** Register a hook for events */
    registerHook(event: string, handler: (...args: any[]) => any): void;
    
    /** Unregister handlers */
    unregisterConverter(extension: string): void;
    unregisterArchiveHandler(type: string): void;
    unregisterModOverride(pattern: string): void;
    unregisterAssetPatch(assetPath: string): void;
    unregisterHook(event: string, handler: Function): void;
}

/**
 * File converter interface for plugins
 */
export interface IFileConverter {
    /** Convert file data to target format */
    convert(data: Buffer, options?: any): Promise<Buffer>;
    
    /** Get supported input formats */
    getSupportedFormats(): string[];
    
    /** Get output format */
    getOutputFormat(): string;
    
    /** Validate if file can be converted */
    canConvert(data: Buffer): boolean;
}

/**
 * Archive handler interface for plugins
 */
export interface IArchiveHandler {
    /** Check if this handler supports the archive */
    canHandle(data: Buffer): boolean;
    
    /** Open and parse archive */
    openArchive(data: Buffer): Promise<IPluginArchive>;
    
    /** Get handler version */
    getVersion(): string;
}

/**
 * Plugin archive interface
 */
export interface IPluginArchive {
    /** Get list of files in archive */
    getFileList(): string[];
    
    /** Check if file exists */
    hasFile(filePath: string): boolean;
    
    /** Read file from archive */
    readFile(filePath: string): Buffer;
    
    /** Get file metadata */
    getFileMetadata(filePath: string): Record<string, any>;
    
    /** Close archive */
    close(): void;
}

/**
 * Mod override interface
 */
export interface IModOverride {
    /** Override file content */
    override(originalData: Buffer, filePath: string): Promise<Buffer>;
    
    /** Check if override should be applied */
    shouldOverride(filePath: string): boolean;
    
    /** Get override priority */
    getPriority(): number;
}

/**
 * Asset patch interface
 */
export interface IAssetPatch {
    /** Apply patch to asset data */
    patch(assetData: Buffer): Promise<Buffer>;
    
    /** Check if patch is compatible with asset */
    isCompatible(assetData: Buffer): boolean;
    
    /** Get patch version */
    getVersion(): string;
}

/**
 * Plugin Manager - handles dynamic loading and management of plugins
 */
export class PluginManager extends EventEmitter {
    private plugins: Map<string, IPlugin> = new Map();
    private pluginConfigs: Map<string, Record<string, any>> = new Map();
    private vfs: VirtualFileSystem;
    private converters: Map<string, IFileConverter> = new Map();
    private archiveHandlers: Map<string, IArchiveHandler> = new Map();
    private modOverrides: Map<string, IModOverride[]> = new Map();
    private assetPatches: Map<string, IAssetPatch[]> = new Map();
    private eventHooks: Map<string, Function[]> = new Map();
    private logger: IPluginLogger;

    constructor(vfs: VirtualFileSystem, logger?: IPluginLogger) {
        super();
        this.vfs = vfs;
        this.logger = logger || this.createDefaultLogger();
    }

    /**
     * Load a plugin from file or module
     */
    async loadPlugin(pluginPath: string, config?: Record<string, any>): Promise<boolean> {
        const startTime = Date.now();
        
        try {
            // Import the plugin module
            const pluginModule = await this.importPlugin(pluginPath);
            
            if (!pluginModule.default || typeof pluginModule.default !== 'function') {
                throw new Error('Plugin must export a default function that returns an IPlugin instance');
            }

            // Create plugin instance
            const plugin: IPlugin = pluginModule.default();
            
            if (!this.validatePlugin(plugin)) {
                throw new Error('Plugin validation failed');
            }

            // Check dependencies
            const dependencyCheck = await this.checkDependencies(plugin.metadata);
            if (!dependencyCheck.success) {
                throw new Error(`Dependency check failed: ${dependencyCheck.error}`);
            }

            // Store plugin configuration
            if (config) {
                this.pluginConfigs.set(plugin.metadata.id, config);
            }

            // Create plugin context
            const context = this.createPluginContext(plugin);

            // Initialize plugin
            await plugin.initialize(context);

            // Store plugin
            this.plugins.set(plugin.metadata.id, plugin);

            const loadTime = Date.now() - startTime;
            this.logger.info(`Plugin ${plugin.metadata.name} loaded successfully in ${loadTime}ms`);
            
            this.emit('pluginLoaded', {
                pluginId: plugin.metadata.id,
                pluginName: plugin.metadata.name,
                loadTime
            });

            return true;

        } catch (error) {
            const loadTime = Date.now() - startTime;
            this.logger.error(`Failed to load plugin from ${pluginPath}:`, error);
            
            this.emit('pluginLoadFailed', {
                pluginPath,
                error,
                loadTime
            });

            return false;
        }
    }

    /**
     * Get loaded plugin
     */
    getPlugin(pluginId: string): IPlugin | undefined {
        return this.plugins.get(pluginId);
    }

    /**
     * Get all loaded plugins
     */
    getLoadedPlugins(): IPlugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * Apply mod overrides
     */
    async applyModOverrides(data: Buffer, filePath: string): Promise<Buffer> {
        let modifiedData = data;

        // Get all applicable overrides
        const applicableOverrides: IModOverride[] = [];
        
        for (const [pattern, overrides] of this.modOverrides) {
            if (this.matchesPattern(filePath, pattern)) {
                for (const override of overrides) {
                    if (override.shouldOverride(filePath)) {
                        applicableOverrides.push(override);
                    }
                }
            }
        }

        // Sort by priority (highest first)
        applicableOverrides.sort((a, b) => b.getPriority() - a.getPriority());

        // Apply overrides in order
        for (const override of applicableOverrides) {
            try {
                modifiedData = await override.override(modifiedData, filePath);
                this.logger.debug(`Applied mod override to ${filePath}`);
            } catch (error) {
                this.logger.error(`Failed to apply mod override to ${filePath}:`, error);
            }
        }

        return modifiedData;
    }

    // Private methods
    private async importPlugin(pluginPath: string): Promise<any> {
        // Dynamic import - in a real implementation, this might use different methods
        return import(pluginPath);
    }

    private validatePlugin(plugin: IPlugin): boolean {
        if (!plugin.metadata || !plugin.initialize || !plugin.cleanup) {
            return false;
        }

        const metadata = plugin.metadata;
        if (!metadata.id || !metadata.name || !metadata.version || !metadata.type) {
            return false;
        }

        return true;
    }

    private async checkDependencies(metadata: IPluginMetadata): Promise<{ success: boolean; error?: string }> {
        if (!metadata.dependencies || metadata.dependencies.length === 0) {
            return { success: true };
        }

        for (const dependency of metadata.dependencies) {
            if (!this.plugins.has(dependency)) {
                return { 
                    success: false, 
                    error: `Missing dependency: ${dependency}` 
                };
            }
        }

        return { success: true };
    }

    private createPluginContext(plugin: IPlugin): IPluginContext {
        return {
            vfs: this.vfs,
            pluginManager: this,
            logger: this.createPluginLogger(plugin.metadata.id),
            eventBus: this,
            config: this.pluginConfigs.get(plugin.metadata.id) || {},
            api: this.createPluginAPI(plugin.metadata.id)
        };
    }

    private createPluginLogger(pluginId: string): IPluginLogger {
        return {
            debug: (message: string, ...args: any[]) => this.logger.debug(`[${pluginId}] ${message}`, ...args),
            info: (message: string, ...args: any[]) => this.logger.info(`[${pluginId}] ${message}`, ...args),
            warn: (message: string, ...args: any[]) => this.logger.warn(`[${pluginId}] ${message}`, ...args),
            error: (message: string, ...args: any[]) => this.logger.error(`[${pluginId}] ${message}`, ...args)
        };
    }

    private createPluginAPI(pluginId: string): IPluginAPI {
        return {
            registerConverter: (extension: string, converter: IFileConverter) => {
                this.converters.set(extension.toLowerCase(), converter);
            },
            
            registerArchiveHandler: (type: string, handler: IArchiveHandler) => {
                this.archiveHandlers.set(type, handler);
            },
            
            registerModOverride: (pattern: string, handler: IModOverride) => {
                if (!this.modOverrides.has(pattern)) {
                    this.modOverrides.set(pattern, []);
                }
                this.modOverrides.get(pattern)!.push(handler);
            },
            
            registerAssetPatch: (assetPath: string, patch: IAssetPatch) => {
                if (!this.assetPatches.has(assetPath)) {
                    this.assetPatches.set(assetPath, []);
                }
                this.assetPatches.get(assetPath)!.push(patch);
            },
            
            registerHook: (event: string, handler: (...args: any[]) => any) => {
                if (!this.eventHooks.has(event)) {
                    this.eventHooks.set(event, []);
                }
                this.eventHooks.get(event)!.push(handler);
            },
            
            unregisterConverter: (extension: string) => {
                this.converters.delete(extension.toLowerCase());
            },
            
            unregisterArchiveHandler: (type: string) => {
                this.archiveHandlers.delete(type);
            },
            
            unregisterModOverride: (pattern: string) => {
                this.modOverrides.delete(pattern);
            },
            
            unregisterAssetPatch: (assetPath: string) => {
                this.assetPatches.delete(assetPath);
            },
            
            unregisterHook: (event: string, handler: Function) => {
                const hooks = this.eventHooks.get(event);
                if (hooks) {
                    const index = hooks.indexOf(handler);
                    if (index >= 0) {
                        hooks.splice(index, 1);
                    }
                }
            }
        };
    }

    private matchesPattern(filePath: string, pattern: string): boolean {
        // Simple pattern matching - could be enhanced with regex or glob patterns
        return filePath.includes(pattern) || 
               new RegExp(pattern.replace(/\*/g, '.*')).test(filePath);
    }

    private createDefaultLogger(): IPluginLogger {
        return {
            debug: (message: string, ...args: any[]) => console.debug(`[PluginManager] ${message}`, ...args),
            info: (message: string, ...args: any[]) => console.info(`[PluginManager] ${message}`, ...args),
            warn: (message: string, ...args: any[]) => console.warn(`[PluginManager] ${message}`, ...args),
            error: (message: string, ...args: any[]) => console.error(`[PluginManager] ${message}`, ...args)
        };
    }
}