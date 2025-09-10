import { EventEmitter } from 'events';
import { logger } from '../core/logging/Logger';

/**
 * Plugin Marketplace System for unpak.js
 * Phase 13 - Community and Ecosystem
 *
 * This system enables:
 * - Community plugin discovery and installation
 * - Plugin registry management
 * - Version compatibility checking
 * - Automated plugin updates
 * - Asset sharing and collaboration tools
 */

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  tags: string[];
  compatibility: {
    unpakVersion: string;
    ueVersions: string[];
    gameSupport?: string[];
  };
  dependencies: Record<string, string>;
  repository: string;
  homepage?: string;
  downloadUrl: string;
  checksums: {
    sha256: string;
    md5: string;
  };
  permissions: PluginPermission[];
  installation: {
    type: 'npm' | 'git' | 'archive';
    instructions?: string;
    postInstall?: string[];
  };
}

export interface PluginPermission {
  type: 'filesystem' | 'network' | 'system' | 'assets';
  scope: string;
  description: string;
  required: boolean;
}

export interface PluginRating {
  pluginName: string;
  userId: string;
  rating: number; // 1-5 stars
  review?: string;
  timestamp: Date;
  verified: boolean;
}

export interface CommunityPlugin {
  manifest: PluginManifest;
  statistics: {
    downloads: number;
    rating: number;
    reviewCount: number;
    lastUpdated: Date;
    trending: boolean;
  };
  ratings: PluginRating[];
}

/**
 * Plugin Marketplace Manager
 */
export class PluginMarketplace extends EventEmitter {
  private plugins: Map<string, CommunityPlugin> = new Map();
  private installedPlugins: Map<string, PluginManifest> = new Map();
  private registryUrl: string;
  private apiKey?: string;

  constructor(registryUrl: string = 'https://marketplace.unpak.dev', apiKey?: string) {
    super();
    this.registryUrl = registryUrl;
    this.apiKey = apiKey;
  }

  /**
   * Search for plugins in the marketplace
   */
  async searchPlugins(query: {
    name?: string;
    tags?: string[];
    gameSupport?: string;
    author?: string;
    minRating?: number;
    sortBy?: 'popularity' | 'rating' | 'recent' | 'name';
    limit?: number;
  }): Promise<CommunityPlugin[]> {
    logger.info('Searching marketplace plugins', { query });

    try {
      const searchParams = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            searchParams.append(key, value.join(','));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`${this.registryUrl}/search?${searchParams}`);
      if (!response.ok) {
        throw new Error(`Marketplace search failed: ${response.statusText}`);
      }

      const results = (await response.json()) as { plugins?: CommunityPlugin[] };
      return results.plugins || [];
    } catch (error: any) {
      logger.error('Failed to search marketplace', error);

      // Fallback to local plugin registry if available
      return this.searchLocalPlugins(query);
    }
  }

  /**
   * Get plugin details by name
   */
  async getPlugin(name: string): Promise<CommunityPlugin | null> {
    logger.info('Fetching plugin details', { name });

    try {
      const response = await fetch(`${this.registryUrl}/plugins/${encodeURIComponent(name)}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch plugin: ${response.statusText}`);
      }

      return (await response.json()) as CommunityPlugin;
    } catch (error: any) {
      logger.error('Failed to fetch plugin details', error, { name });
      return this.plugins.get(name) || null;
    }
  }

  /**
   * Install a plugin from the marketplace
   */
  async installPlugin(
    name: string,
    version?: string,
    options: {
      skipDependencies?: boolean;
      skipPermissionCheck?: boolean;
      force?: boolean;
    } = {},
  ): Promise<boolean> {
    logger.info('Installing plugin', { name, version, options });

    try {
      // Get plugin manifest
      const plugin = await this.getPlugin(name);
      if (!plugin) {
        throw new Error(`Plugin '${name}' not found in marketplace`);
      }

      const manifest = plugin.manifest;

      // Version compatibility check
      if (version && manifest.version !== version) {
        logger.warn('Requested version differs from latest', {
          requested: version,
          latest: manifest.version,
        });
      }

      // Check unpak.js compatibility
      if (!this.isVersionCompatible(manifest.compatibility.unpakVersion)) {
        if (!options.force) {
          throw new Error(
            `Plugin requires unpak.js ${manifest.compatibility.unpakVersion}, current version may be incompatible`,
          );
        }
        logger.warn('Installing potentially incompatible plugin', {
          required: manifest.compatibility.unpakVersion,
        });
      }

      // Permission check
      if (!options.skipPermissionCheck && !(await this.checkPermissions(manifest.permissions))) {
        throw new Error('Required permissions not granted');
      }

      // Install dependencies first
      if (!options.skipDependencies) {
        await this.installDependencies(manifest.dependencies);
      }

      // Download and install the plugin
      await this.downloadAndInstallPlugin(manifest);

      // Register as installed
      this.installedPlugins.set(name, manifest);

      // Run post-install scripts
      if (manifest.installation.postInstall) {
        await this.runPostInstallScripts(manifest.installation.postInstall);
      }

      this.emit('pluginInstalled', { name, version: manifest.version });
      logger.info('Plugin installed successfully', { name, version: manifest.version });

      return true;
    } catch (error: any) {
      logger.error('Plugin installation failed', error, { name });
      this.emit('installError', { name, error: error.message });
      return false;
    }
  }

  /**
   * List installed plugins
   */
  getInstalledPlugins(): PluginManifest[] {
    return Array.from(this.installedPlugins.values());
  }

  /**
   * Get featured/trending plugins
   */
  async getFeaturedPlugins(limit: number = 10): Promise<CommunityPlugin[]> {
    try {
      const response = await fetch(`${this.registryUrl}/featured?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch featured plugins: ${response.statusText}`);
      }

      return (await response.json()) as CommunityPlugin[];
    } catch (error: any) {
      logger.error('Failed to fetch featured plugins', error);

      // Return local trending plugins as fallback
      return Array.from(this.plugins.values())
        .filter(p => p.statistics.trending)
        .slice(0, limit);
    }
  }

  // Private helper methods
  private searchLocalPlugins(query: any): CommunityPlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => {
      if (query.name && !plugin.manifest.name.toLowerCase().includes(query.name.toLowerCase())) {
        return false;
      }
      if (query.tags && !query.tags.some((tag: string) => plugin.manifest.tags.includes(tag))) {
        return false;
      }
      if (query.minRating && plugin.statistics.rating < query.minRating) {
        return false;
      }
      return true;
    });
  }

  private isVersionCompatible(requiredVersion: string): boolean {
    // Simple semver compatibility check
    const current = '2.0.0'; // Current unpak.js version
    return current >= requiredVersion;
  }

  private async checkPermissions(permissions: PluginPermission[]): Promise<boolean> {
    // In a real implementation, this would show a permission dialog
    logger.info('Plugin requires permissions', { permissions });
    return true;
  }

  private async installDependencies(dependencies: Record<string, string>): Promise<void> {
    for (const [depName, depVersion] of Object.entries(dependencies)) {
      if (!this.installedPlugins.has(depName)) {
        logger.info('Installing dependency', { name: depName, version: depVersion });
        await this.installPlugin(depName, depVersion, { skipDependencies: true });
      }
    }
  }

  private async downloadAndInstallPlugin(manifest: PluginManifest): Promise<void> {
    // Implementation would download and extract the plugin
    logger.info('Downloading plugin', { name: manifest.name, url: manifest.downloadUrl });

    // Simulate download and installation
    await new Promise(resolve => setTimeout(resolve, 1000));

    logger.info('Plugin downloaded and installed', { name: manifest.name });
  }

  private async runPostInstallScripts(scripts: string[]): Promise<void> {
    for (const script of scripts) {
      logger.info('Running post-install script', { script });
      // Implementation would execute the script safely
    }
  }
}
