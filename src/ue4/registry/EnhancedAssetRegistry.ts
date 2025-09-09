import { AssetRegistry } from "../AssetRegistry";
import { FAssetData } from "../objects/FAssetData";
import { FDependsNode } from "../objects/FDependsNode";
import { FAssetPackageData } from "../objects/FAssetPackageData";
import { FName } from "../../objects/uobject/FName";

/**
 * Enhanced Asset Registry features for Phase 8 continuation
 * Provides advanced asset dependency mapping, search, and filtering capabilities
 */

export interface IAssetFilter {
    /** Filter by asset class name */
    className?: string;
    /** Filter by package name pattern */
    packageName?: string;
    /** Filter by asset name pattern */
    assetName?: string;
    /** Filter by tags */
    tags?: Record<string, any>;
    /** Filter by dependencies */
    hasDependency?: string;
    /** Filter by dependents */
    hasDependents?: boolean;
}

export interface IAssetDependencyMap {
    /** Direct dependencies */
    direct: string[];
    /** Transitive dependencies */
    transitive: string[];
    /** Reverse dependencies (what depends on this asset) */
    dependents: string[];
    /** Circular dependencies if any */
    circular: string[];
}

export interface IAssetSearchResult {
    /** Found asset data */
    asset: FAssetData;
    /** Relevance score (0-1) */
    score: number;
    /** Match reasons */
    matchReasons: string[];
}

/**
 * Enhanced Asset Registry with advanced features
 */
export class EnhancedAssetRegistry extends AssetRegistry {
    private dependencyCache: Map<string, IAssetDependencyMap> = new Map();
    private assetsByClass: Map<string, FAssetData[]> = new Map();
    private assetsByPackage: Map<string, FAssetData[]> = new Map();
    private initialized = false;

    /**
     * Initialize enhanced features and build caches
     */
    initialize(): void {
        if (this.initialized) return;

        this.buildClassIndex();
        this.buildPackageIndex();
        this.buildDependencyMaps();
        
        this.initialized = true;
    }

    /**
     * Build index of assets by class name
     */
    private buildClassIndex(): void {
        this.assetsByClass.clear();
        
        for (const asset of this.preallocatedAssetDataBuffer) {
            const className = asset.assetClass.text;
            if (!this.assetsByClass.has(className)) {
                this.assetsByClass.set(className, []);
            }
            this.assetsByClass.get(className)!.push(asset);
        }
    }

    /**
     * Build index of assets by package name
     */
    private buildPackageIndex(): void {
        this.assetsByPackage.clear();
        
        for (const asset of this.preallocatedAssetDataBuffer) {
            const packageName = asset.packageName.text;
            if (!this.assetsByPackage.has(packageName)) {
                this.assetsByPackage.set(packageName, []);
            }
            this.assetsByPackage.get(packageName)!.push(asset);
        }
    }

    /**
     * Build comprehensive dependency maps for all assets
     */
    private buildDependencyMaps(): void {
        this.dependencyCache.clear();
        
        // First pass: build direct dependency maps
        for (const asset of this.preallocatedAssetDataBuffer) {
            const assetId = this.getAssetId(asset);
            const dependencyMap: IAssetDependencyMap = {
                direct: [],
                transitive: [],
                dependents: [],
                circular: []
            };
            
            // Find the depends node for this asset
            const dependsNode = this.findDependsNode(asset);
            if (dependsNode) {
                dependencyMap.direct = this.extractDirectDependencies(dependsNode);
            }
            
            this.dependencyCache.set(assetId, dependencyMap);
        }
        
        // Second pass: build reverse dependencies
        for (const [assetId, depMap] of this.dependencyCache) {
            for (const dependency of depMap.direct) {
                const depDependencyMap = this.dependencyCache.get(dependency);
                if (depDependencyMap) {
                    depDependencyMap.dependents.push(assetId);
                }
            }
        }
        
        // Third pass: compute transitive dependencies and detect cycles
        for (const [assetId] of this.dependencyCache) {
            this.computeTransitiveDependencies(assetId);
        }
    }

    /**
     * Get unique identifier for an asset
     */
    private getAssetId(asset: FAssetData): string {
        return `${asset.packageName.text}:${asset.assetName.text}`;
    }

    /**
     * Find depends node for an asset
     */
    private findDependsNode(asset: FAssetData): FDependsNode | null {
        // This would need to be implemented based on the actual relationship
        // between FAssetData and FDependsNode in the registry structure
        return null; // Placeholder
    }

    /**
     * Extract direct dependencies from a depends node
     */
    private extractDirectDependencies(node: FDependsNode): string[] {
        // This would extract the actual dependencies from the node
        return []; // Placeholder
    }

    /**
     * Compute transitive dependencies using DFS
     */
    private computeTransitiveDependencies(assetId: string): void {
        const visited = new Set<string>();
        const stack = new Set<string>();
        const transitive = new Set<string>();
        const circular: string[] = [];

        const dfs = (currentId: string): void => {
            if (stack.has(currentId)) {
                circular.push(currentId);
                return;
            }
            
            if (visited.has(currentId)) {
                return;
            }

            visited.add(currentId);
            stack.add(currentId);

            const depMap = this.dependencyCache.get(currentId);
            if (depMap) {
                for (const dependency of depMap.direct) {
                    transitive.add(dependency);
                    dfs(dependency);
                }
            }

            stack.delete(currentId);
        };

        dfs(assetId);

        const depMap = this.dependencyCache.get(assetId);
        if (depMap) {
            depMap.transitive = Array.from(transitive);
            depMap.circular = circular;
        }
    }

    /**
     * Search assets with advanced filtering
     */
    searchAssets(query: string, filter?: IAssetFilter): IAssetSearchResult[] {
        if (!this.initialized) {
            this.initialize();
        }

        const results: IAssetSearchResult[] = [];
        const queryLower = query.toLowerCase();

        for (const asset of this.preallocatedAssetDataBuffer) {
            let score = 0;
            const matchReasons: string[] = [];

            // Apply filters first
            if (filter && !this.matchesFilter(asset, filter)) {
                continue;
            }

            // Text search scoring
            const assetName = asset.assetName.text.toLowerCase();
            const packageName = asset.packageName.text.toLowerCase();
            const className = asset.assetClass.text.toLowerCase();

            // Exact matches get highest score
            if (assetName === queryLower) {
                score += 1.0;
                matchReasons.push("Exact asset name match");
            } else if (assetName.includes(queryLower)) {
                score += 0.8;
                matchReasons.push("Partial asset name match");
            }

            if (className === queryLower) {
                score += 0.6;
                matchReasons.push("Exact class name match");
            } else if (className.includes(queryLower)) {
                score += 0.4;
                matchReasons.push("Partial class name match");
            }

            if (packageName.includes(queryLower)) {
                score += 0.3;
                matchReasons.push("Package name match");
            }

            // Only include results with some score
            if (score > 0) {
                results.push({
                    asset,
                    score,
                    matchReasons
                });
            }
        }

        // Sort by score descending
        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Check if an asset matches the given filter
     */
    private matchesFilter(asset: FAssetData, filter: IAssetFilter): boolean {
        if (filter.className && asset.assetClass.text !== filter.className) {
            return false;
        }

        if (filter.packageName && !asset.packageName.text.includes(filter.packageName)) {
            return false;
        }

        if (filter.assetName && !asset.assetName.text.includes(filter.assetName)) {
            return false;
        }

        if (filter.hasDependency) {
            const assetId = this.getAssetId(asset);
            const depMap = this.dependencyCache.get(assetId);
            if (!depMap || !depMap.direct.includes(filter.hasDependency)) {
                return false;
            }
        }

        if (filter.hasDependents !== undefined) {
            const assetId = this.getAssetId(asset);
            const depMap = this.dependencyCache.get(assetId);
            const hasDependents = depMap && depMap.dependents.length > 0;
            if (filter.hasDependents !== hasDependents) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get assets by class name
     */
    getAssetsByClass(className: string): FAssetData[] {
        if (!this.initialized) {
            this.initialize();
        }
        return this.assetsByClass.get(className) || [];
    }

    /**
     * Get assets by package name
     */
    getAssetsByPackage(packageName: string): FAssetData[] {
        if (!this.initialized) {
            this.initialize();
        }
        return this.assetsByPackage.get(packageName) || [];
    }

    /**
     * Get dependency map for an asset
     */
    getDependencyMap(asset: FAssetData): IAssetDependencyMap | null {
        if (!this.initialized) {
            this.initialize();
        }
        const assetId = this.getAssetId(asset);
        return this.dependencyCache.get(assetId) || null;
    }

    /**
     * Find all assets that depend on the given asset
     */
    findDependents(asset: FAssetData): FAssetData[] {
        const dependencyMap = this.getDependencyMap(asset);
        if (!dependencyMap) {
            return [];
        }

        const dependents: FAssetData[] = [];
        for (const dependentId of dependencyMap.dependents) {
            const dependent = this.findAssetById(dependentId);
            if (dependent) {
                dependents.push(dependent);
            }
        }

        return dependents;
    }

    /**
     * Find all dependencies of the given asset
     */
    findDependencies(asset: FAssetData, includeTransitive = false): FAssetData[] {
        const dependencyMap = this.getDependencyMap(asset);
        if (!dependencyMap) {
            return [];
        }

        const dependencies: FAssetData[] = [];
        const dependencyIds = includeTransitive ? 
            [...dependencyMap.direct, ...dependencyMap.transitive] : 
            dependencyMap.direct;

        for (const dependencyId of dependencyIds) {
            const dependency = this.findAssetById(dependencyId);
            if (dependency) {
                dependencies.push(dependency);
            }
        }

        return dependencies;
    }

    /**
     * Find an asset by its ID
     */
    private findAssetById(assetId: string): FAssetData | null {
        const [packageName, assetName] = assetId.split(':');
        return this.preallocatedAssetDataBuffer.find(asset => 
            asset.packageName.text === packageName && 
            asset.assetName.text === assetName
        ) || null;
    }

    /**
     * Get statistics about the registry
     */
    getStatistics(): {
        totalAssets: number;
        assetsByClass: Record<string, number>;
        packagesCount: number;
        dependencyStats: {
            averageDependencies: number;
            maxDependencies: number;
            circularDependencies: number;
        };
    } {
        if (!this.initialized) {
            this.initialize();
        }

        const assetsByClass: Record<string, number> = {};
        for (const [className, assets] of this.assetsByClass) {
            assetsByClass[className] = assets.length;
        }

        let totalDependencies = 0;
        let maxDependencies = 0;
        let circularCount = 0;

        for (const depMap of this.dependencyCache.values()) {
            totalDependencies += depMap.direct.length;
            maxDependencies = Math.max(maxDependencies, depMap.direct.length);
            if (depMap.circular.length > 0) {
                circularCount++;
            }
        }

        return {
            totalAssets: this.preallocatedAssetDataBuffer.length,
            assetsByClass,
            packagesCount: this.assetsByPackage.size,
            dependencyStats: {
                averageDependencies: this.preallocatedAssetDataBuffer.length > 0 ? 
                    totalDependencies / this.preallocatedAssetDataBuffer.length : 0,
                maxDependencies,
                circularDependencies: circularCount
            }
        };
    }
}