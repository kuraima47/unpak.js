/**
 * UPlugin file parser for Unreal Engine plugin files
 * Implements Phase 9: Plugin and Modding Support
 */

export interface IPluginDependency {
    /** Name of the dependency plugin */
    name: string;
    /** Whether the dependency is enabled */
    enabled: boolean;
    /** Whether the dependency is optional */
    optional?: boolean;
}

export interface IPluginModule {
    /** Name of the module */
    name: string;
    /** Type of the module (Runtime, Editor, etc.) */
    type: string;
    /** Loading phase for the module */
    loadingPhase?: string;
    /** Additional platform restrictions */
    whitelistPlatforms?: string[];
    /** Platforms to exclude */
    blacklistPlatforms?: string[];
}

export interface IPluginDescriptor {
    /** File format version */
    fileVersion: number;
    /** Plugin version */
    version: number;
    /** Plugin version name */
    versionName?: string;
    /** Plugin friendly name */
    friendlyName?: string;
    /** Plugin description */
    description?: string;
    /** Plugin category */
    category?: string;
    /** Plugin author */
    createdBy?: string;
    /** Plugin author URL */
    createdByURL?: string;
    /** Documentation URL */
    docsURL?: string;
    /** Marketplace URL */
    marketplaceURL?: string;
    /** Support URL */
    supportURL?: string;
    /** Whether plugin can contain content */
    canContainContent?: boolean;
    /** Whether plugin is beta */
    isBetaVersion?: boolean;
    /** Whether plugin is experimental */
    isExperimentalVersion?: boolean;
    /** Whether plugin is installed */
    installed?: boolean;
    /** Modules defined by this plugin */
    modules: IPluginModule[];
    /** Plugins this plugin depends on */
    plugins?: IPluginDependency[];
    /** Platform whitelist */
    whitelistPlatforms?: string[];
    /** Platform blacklist */
    blacklistPlatforms?: string[];
    /** Target platforms */
    targetPlatforms?: string[];
    /** Supported target platforms */
    supportedTargetPlatforms?: string[];
    /** Engine version */
    engineVersion?: string;
    /** Enable by default for all projects */
    enabledByDefault?: boolean;
    /** Hidden from the plugin browser */
    hidden?: boolean;
    /** Pre-build steps */
    preBuildSteps?: any;
    /** Post-build steps */
    postBuildSteps?: any;
}

/**
 * UPlugin file parser
 */
export class UPluginParser {
    private pluginData: IPluginDescriptor;

    constructor(pluginData: IPluginDescriptor) {
        this.pluginData = pluginData;
    }

    /**
     * Parse a .uplugin file from JSON string
     * @param jsonContent JSON content of the .uplugin file
     * @returns UPluginParser instance
     */
    static fromJSON(jsonContent: string): UPluginParser {
        try {
            const data = JSON.parse(jsonContent) as IPluginDescriptor;
            return new UPluginParser(data);
        } catch (error: any) {
            throw new Error(`Failed to parse .uplugin file: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Parse a .uplugin file from Buffer
     * @param buffer Buffer containing the .uplugin file
     * @returns UPluginParser instance
     */
    static fromBuffer(buffer: Buffer): UPluginParser {
        const content = buffer.toString('utf-8');
        return this.fromJSON(content);
    }

    /**
     * Get plugin name from filename or descriptor
     * @returns Plugin name
     */
    getPluginName(): string {
        return this.pluginData.friendlyName || "Unknown Plugin";
    }

    /**
     * Get plugin version
     * @returns Plugin version
     */
    getVersion(): number {
        return this.pluginData.version || 1;
    }

    /**
     * Get plugin version string
     * @returns Plugin version string
     */
    getVersionName(): string {
        return this.pluginData.versionName || this.getVersion().toString();
    }

    /**
     * Get plugin description
     * @returns Plugin description
     */
    getDescription(): string {
        return this.pluginData.description || "";
    }

    /**
     * Get plugin category
     * @returns Plugin category
     */
    getCategory(): string {
        return this.pluginData.category || "Other";
    }

    /**
     * Check if plugin can contain content
     * @returns Whether plugin can contain content
     */
    canContainContent(): boolean {
        return this.pluginData.canContainContent || false;
    }

    /**
     * Check if plugin is beta
     * @returns Whether plugin is beta
     */
    isBeta(): boolean {
        return this.pluginData.isBetaVersion || false;
    }

    /**
     * Check if plugin is experimental
     * @returns Whether plugin is experimental
     */
    isExperimental(): boolean {
        return this.pluginData.isExperimentalVersion || false;
    }

    /**
     * Get plugin modules
     * @returns Array of plugin modules
     */
    getModules(): IPluginModule[] {
        return this.pluginData.modules || [];
    }

    /**
     * Get plugin dependencies
     * @returns Array of plugin dependencies
     */
    getDependencies(): IPluginDependency[] {
        return this.pluginData.plugins || [];
    }

    /**
     * Get required dependencies (non-optional)
     * @returns Array of required dependencies
     */
    getRequiredDependencies(): IPluginDependency[] {
        return this.getDependencies().filter(dep => !dep.optional);
    }

    /**
     * Get optional dependencies
     * @returns Array of optional dependencies
     */
    getOptionalDependencies(): IPluginDependency[] {
        return this.getDependencies().filter(dep => dep.optional);
    }

    /**
     * Check if plugin supports a specific platform
     * @param platform Platform to check
     * @returns Whether platform is supported
     */
    supportsPlatform(platform: string): boolean {
        const whitelist = this.pluginData.whitelistPlatforms;
        const blacklist = this.pluginData.blacklistPlatforms;

        // If blacklisted, not supported
        if (blacklist && blacklist.includes(platform)) {
            return false;
        }

        // If whitelist exists and platform not in it, not supported
        if (whitelist && whitelist.length > 0) {
            return whitelist.includes(platform);
        }

        // Default: supported
        return true;
    }

    /**
     * Get modules for a specific loading phase
     * @param loadingPhase Loading phase to filter by
     * @returns Array of modules for the specified phase
     */
    getModulesForPhase(loadingPhase: string): IPluginModule[] {
        return this.getModules().filter(module => 
            module.loadingPhase === loadingPhase
        );
    }

    /**
     * Get runtime modules
     * @returns Array of runtime modules
     */
    getRuntimeModules(): IPluginModule[] {
        return this.getModules().filter(module => 
            module.type === "Runtime" || module.type === "RuntimeAndProgram"
        );
    }

    /**
     * Get editor modules
     * @returns Array of editor modules
     */
    getEditorModules(): IPluginModule[] {
        return this.getModules().filter(module => 
            module.type === "Editor" || module.type === "EditorAndProgram"
        );
    }

    /**
     * Validate plugin descriptor
     * @returns Array of validation errors (empty if valid)
     */
    validate(): string[] {
        const errors: string[] = [];

        if (!this.pluginData.fileVersion || this.pluginData.fileVersion < 1) {
            errors.push("Invalid or missing file version");
        }

        if (!this.pluginData.modules || this.pluginData.modules.length === 0) {
            errors.push("Plugin must define at least one module");
        }

        // Validate modules
        this.pluginData.modules?.forEach((module, index) => {
            if (!module.name) {
                errors.push(`Module ${index} is missing a name`);
            }
            if (!module.type) {
                errors.push(`Module ${index} is missing a type`);
            }
        });

        return errors;
    }

    /**
     * Convert to JSON representation
     * @returns JSON object
     */
    toJson(): IPluginDescriptor {
        return { ...this.pluginData };
    }
}

/**
 * Plugin dependency resolver
 */
export class PluginDependencyResolver {
    private plugins: Map<string, UPluginParser> = new Map();

    /**
     * Add a plugin to the resolver
     * @param name Plugin name
     * @param plugin Plugin parser instance
     */
    addPlugin(name: string, plugin: UPluginParser): void {
        this.plugins.set(name, plugin);
    }

    /**
     * Check if all dependencies for a plugin are satisfied
     * @param pluginName Name of the plugin to check
     * @returns Object containing resolution status and missing dependencies
     */
    resolveDependencies(pluginName: string): {
        resolved: boolean;
        missing: string[];
        circular: string[];
    } {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            return { resolved: false, missing: [pluginName], circular: [] };
        }

        const missing: string[] = [];
        const circular: string[] = [];
        const visited = new Set<string>();
        const stack = new Set<string>();

        const checkDependencies = (currentPlugin: string): void => {
            if (stack.has(currentPlugin)) {
                circular.push(currentPlugin);
                return;
            }

            if (visited.has(currentPlugin)) {
                return;
            }

            visited.add(currentPlugin);
            stack.add(currentPlugin);

            const currentPluginParser = this.plugins.get(currentPlugin);
            if (!currentPluginParser) {
                missing.push(currentPlugin);
                return;
            }

            const dependencies = currentPluginParser.getRequiredDependencies();
            for (const dep of dependencies) {
                if (!this.plugins.has(dep.name)) {
                    missing.push(dep.name);
                } else {
                    checkDependencies(dep.name);
                }
            }

            stack.delete(currentPlugin);
        };

        checkDependencies(pluginName);

        return {
            resolved: missing.length === 0 && circular.length === 0,
            missing,
            circular
        };
    }

    /**
     * Get all plugins that depend on a specific plugin
     * @param pluginName Name of the plugin
     * @returns Array of plugin names that depend on the specified plugin
     */
    getDependents(pluginName: string): string[] {
        const dependents: string[] = [];

        for (const [name, plugin] of this.plugins) {
            const dependencies = plugin.getDependencies();
            if (dependencies.some(dep => dep.name === pluginName)) {
                dependents.push(name);
            }
        }

        return dependents;
    }
}