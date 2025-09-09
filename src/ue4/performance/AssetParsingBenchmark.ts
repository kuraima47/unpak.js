import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { logger } from '../../core/logging/Logger';

/**
 * Asset parsing benchmark system
 * Addresses roadmap item: "Performance Optimization - Asset parsing benchmarks and profiling"
 * 
 * This system provides comprehensive performance monitoring for:
 * - Asset parsing operations across different types
 * - Archive reading and extraction performance
 * - Memory usage patterns during processing
 * - Comparative analysis between different approaches
 */
export class AssetParsingBenchmark extends EventEmitter {
    private readonly benchmarks = new Map<string, BenchmarkResult[]>();
    private readonly activeBenchmarks = new Map<string, BenchmarkSession>();
    private readonly systemMetrics = new SystemMetricsCollector();

    constructor() {
        super();
    }

    /**
     * Start a new benchmark session
     */
    startBenchmark(
        name: string, 
        category: BenchmarkCategory = 'general',
        options: BenchmarkOptions = {}
    ): BenchmarkSession {
        if (this.activeBenchmarks.has(name)) {
            throw new Error(`Benchmark '${name}' is already running`);
        }

        const session = new BenchmarkSession(name, category, options);
        this.activeBenchmarks.set(name, session);

        logger.info('Benchmark started', {
            name,
            category,
            timestamp: session.startTime
        });

        return session;
    }

    /**
     * End a benchmark session and record results
     */
    endBenchmark(name: string): BenchmarkResult {
        const session = this.activeBenchmarks.get(name);
        if (!session) {
            throw new Error(`No active benchmark found with name '${name}'`);
        }

        const result = session.end();
        this.activeBenchmarks.delete(name);

        // Store result
        if (!this.benchmarks.has(name)) {
            this.benchmarks.set(name, []);
        }
        this.benchmarks.get(name)!.push(result);

        logger.info('Benchmark completed', {
            name,
            duration: result.duration,
            memoryPeak: result.memoryPeak,
            operations: result.operationCount
        });

        this.emit('benchmarkCompleted', result);
        return result;
    }

    /**
     * Benchmark asset parsing performance
     */
    async benchmarkAssetParsing<T>(
        assetType: string,
        assets: Array<{ name: string; data: Buffer }>,
        parser: (data: Buffer) => Promise<T>,
        options: AssetParsingBenchmarkOptions = {}
    ): Promise<AssetParsingBenchmarkResult> {
        const benchmarkName = `asset-parsing-${assetType}`;
        const session = this.startBenchmark(benchmarkName, 'asset-parsing', options);

        const results: Array<{ name: string; duration: number; success: boolean; memoryDelta: number }> = [];
        let totalParseTime = 0;
        let successCount = 0;
        let errorCount = 0;

        logger.info('Starting asset parsing benchmark', {
            assetType,
            assetCount: assets.length,
            warmupRuns: options.warmupRuns || 0
        });

        // Warmup runs if specified
        if (options.warmupRuns && options.warmupRuns > 0) {
            logger.debug('Performing warmup runs', { count: options.warmupRuns });
            for (let i = 0; i < options.warmupRuns; i++) {
                const randomAsset = assets[Math.floor(Math.random() * assets.length)];
                try {
                    await parser(randomAsset.data);
                } catch (error) {
                    // Ignore warmup errors
                }
            }
        }

        // Main benchmark
        for (const asset of assets) {
            const memoryBefore = process.memoryUsage().heapUsed;
            const startTime = performance.now();

            try {
                session.recordOperation('parse');
                await parser(asset.data);
                
                const endTime = performance.now();
                const duration = endTime - startTime;
                const memoryAfter = process.memoryUsage().heapUsed;
                const memoryDelta = memoryAfter - memoryBefore;

                totalParseTime += duration;
                successCount++;

                results.push({
                    name: asset.name,
                    duration,
                    success: true,
                    memoryDelta
                });

                session.updateMemoryPeak(memoryAfter);

            } catch (error: any) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                errorCount++;

                results.push({
                    name: asset.name,
                    duration,
                    success: false,
                    memoryDelta: 0
                });

                logger.debug('Asset parsing failed during benchmark', {
                    asset: asset.name,
                    error: error.message
                });
            }

            // Progress reporting
            if (results.length % 100 === 0) {
                this.emit('benchmarkProgress', {
                    name: benchmarkName,
                    processed: results.length,
                    total: assets.length,
                    averageTime: totalParseTime / successCount || 0
                });
            }
        }

        const finalResult = this.endBenchmark(benchmarkName);

        // Calculate specific metrics for asset parsing
        const successfulResults = results.filter(r => r.success);
        const averageParseTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
        const minParseTime = Math.min(...successfulResults.map(r => r.duration));
        const maxParseTime = Math.max(...successfulResults.map(r => r.duration));
        const totalMemoryUsed = results.reduce((sum, r) => sum + Math.max(0, r.memoryDelta), 0);

        return {
            ...finalResult,
            assetType,
            assetCount: assets.length,
            successCount,
            errorCount,
            successRate: (successCount / assets.length) * 100,
            averageParseTime,
            minParseTime,
            maxParseTime,
            totalMemoryUsed,
            averageMemoryPerAsset: totalMemoryUsed / successCount || 0,
            throughput: successCount / (finalResult.duration / 1000), // assets per second
            detailedResults: options.includeDetailedResults ? results : undefined
        };
    }

    /**
     * Benchmark archive reading performance
     */
    async benchmarkArchiveReading(
        archivePath: string,
        filePatterns: string[],
        archiveReader: any,
        options: ArchiveBenchmarkOptions = {}
    ): Promise<ArchiveBenchmarkResult> {
        const benchmarkName = `archive-reading-${Date.now()}`;
        const session = this.startBenchmark(benchmarkName, 'archive-reading', options);

        logger.info('Starting archive reading benchmark', {
            archivePath,
            patterns: filePatterns
        });

        const results: ArchiveOperationResult[] = [];
        let totalReadTime = 0;
        let totalBytes = 0;

        // Benchmark file listing
        const listStartTime = performance.now();
        const allFiles: any[] = [];
        for (const pattern of filePatterns) {
            const files = archiveReader.listFiles(pattern);
            allFiles.push(...files);
        }
        const listEndTime = performance.now();
        const listDuration = listEndTime - listStartTime;

        session.recordOperation('list-files');
        results.push({
            operation: 'list-files',
            duration: listDuration,
            fileCount: allFiles.length,
            bytes: 0,
            success: true
        });

        // Benchmark file reading
        const filesToRead = options.maxFiles ? allFiles.slice(0, options.maxFiles) : allFiles;
        
        for (const file of filesToRead) {
            const readStartTime = performance.now();
            
            try {
                const data = await archiveReader.getFile(file.path);
                const readEndTime = performance.now();
                const readDuration = readEndTime - readStartTime;
                
                const fileSize = data ? data.length : 0;
                totalReadTime += readDuration;
                totalBytes += fileSize;

                session.recordOperation('read-file');
                results.push({
                    operation: 'read-file',
                    duration: readDuration,
                    fileCount: 1,
                    bytes: fileSize,
                    success: true,
                    fileName: file.path
                });

            } catch (error: any) {
                const readEndTime = performance.now();
                const readDuration = readEndTime - readStartTime;

                results.push({
                    operation: 'read-file',
                    duration: readDuration,
                    fileCount: 1,
                    bytes: 0,
                    success: false,
                    fileName: file.path,
                    error: error.message
                });
            }
        }

        const finalResult = this.endBenchmark(benchmarkName);

        const readOperations = results.filter(r => r.operation === 'read-file');
        const successfulReads = readOperations.filter(r => r.success);
        const averageReadTime = successfulReads.reduce((sum, r) => sum + r.duration, 0) / successfulReads.length;
        const throughputMBps = (totalBytes / 1024 / 1024) / (totalReadTime / 1000);

        return {
            ...finalResult,
            archivePath,
            totalFiles: allFiles.length,
            filesRead: filesToRead.length,
            successfulReads: successfulReads.length,
            totalBytes,
            averageReadTime,
            throughputMBps,
            operationResults: options.includeDetailedResults ? results : undefined
        };
    }

    /**
     * Run comparative benchmark between different approaches
     */
    async runComparativeBenchmark<T>(
        name: string,
        testData: any[],
        approaches: Array<{
            name: string;
            implementation: (data: any) => Promise<T>;
        }>,
        options: ComparativeBenchmarkOptions = {}
    ): Promise<ComparativeBenchmarkResult> {
        logger.info('Starting comparative benchmark', {
            name,
            approaches: approaches.map(a => a.name),
            testDataSize: testData.length
        });

        const results: ApproachResult[] = [];

        for (const approach of approaches) {
            logger.info('Testing approach', { approach: approach.name });

            const session = this.startBenchmark(`${name}-${approach.name}`, 'comparative');
            let successCount = 0;
            let errorCount = 0;
            let totalTime = 0;

            for (const data of testData) {
                const startTime = performance.now();
                
                try {
                    await approach.implementation(data);
                    const endTime = performance.now();
                    totalTime += (endTime - startTime);
                    successCount++;
                    session.recordOperation('test');
                } catch (error) {
                    errorCount++;
                }
            }

            const benchmarkResult = this.endBenchmark(`${name}-${approach.name}`);

            results.push({
                name: approach.name,
                totalTime,
                averageTime: totalTime / successCount || 0,
                successCount,
                errorCount,
                successRate: (successCount / testData.length) * 100,
                memoryPeak: benchmarkResult.memoryPeak,
                throughput: successCount / (totalTime / 1000)
            });
        }

        // Find best performing approach
        const bestApproach = results.reduce((best, current) => {
            return current.averageTime < best.averageTime ? current : best;
        });

        // Calculate relative performance
        const relativeResults = results.map(result => ({
            ...result,
            relativePerformance: bestApproach.averageTime / result.averageTime,
            performanceRatio: result.averageTime / bestApproach.averageTime
        }));

        return {
            name,
            testDataSize: testData.length,
            approaches: relativeResults,
            bestApproach: bestApproach.name,
            worstApproach: results.reduce((worst, current) => {
                return current.averageTime > worst.averageTime ? current : worst;
            }).name
        };
    }

    /**
     * Get benchmark results by name
     */
    getBenchmarkResults(name: string): BenchmarkResult[] {
        return this.benchmarks.get(name) || [];
    }

    /**
     * Get all benchmark results
     */
    getAllBenchmarkResults(): Map<string, BenchmarkResult[]> {
        return new Map(this.benchmarks);
    }

    /**
     * Generate benchmark report
     */
    generateReport(category?: BenchmarkCategory): BenchmarkReport {
        const allResults: BenchmarkResult[] = [];
        
        for (const results of this.benchmarks.values()) {
            allResults.push(...results.filter(r => !category || r.category === category));
        }

        if (allResults.length === 0) {
            return {
                totalBenchmarks: 0,
                categories: [],
                summary: {
                    totalDuration: 0,
                    averageDuration: 0,
                    totalOperations: 0,
                    averageMemoryPeak: 0
                },
                recommendations: []
            };
        }

        const categories = [...new Set(allResults.map(r => r.category))];
        const totalDuration = allResults.reduce((sum, r) => sum + r.duration, 0);
        const totalOperations = allResults.reduce((sum, r) => sum + r.operationCount, 0);
        const averageMemoryPeak = allResults.reduce((sum, r) => sum + r.memoryPeak, 0) / allResults.length;

        return {
            totalBenchmarks: allResults.length,
            categories,
            summary: {
                totalDuration,
                averageDuration: totalDuration / allResults.length,
                totalOperations,
                averageMemoryPeak
            },
            recommendations: this.generateRecommendations(allResults)
        };
    }

    /**
     * Generate performance recommendations based on benchmark data
     */
    private generateRecommendations(results: BenchmarkResult[]): string[] {
        const recommendations: string[] = [];

        // Memory usage recommendations
        const highMemoryResults = results.filter(r => r.memoryPeak > 500 * 1024 * 1024); // 500MB
        if (highMemoryResults.length > 0) {
            recommendations.push('Consider enabling incremental parsing for high memory usage operations');
        }

        // Performance recommendations
        const slowResults = results.filter(r => r.duration > 10000); // 10 seconds
        if (slowResults.length > 0) {
            recommendations.push('Consider using parallel processing for long-running operations');
        }

        // Error rate recommendations
        const operations = results.reduce((sum, r) => sum + r.operationCount, 0);
        const errors = results.reduce((sum, r) => sum + (r.errorCount || 0), 0);
        const errorRate = (errors / operations) * 100;

        if (errorRate > 5) {
            recommendations.push('High error rate detected - consider implementing better error handling');
        }

        return recommendations;
    }
}

/**
 * Individual benchmark session
 */
class BenchmarkSession {
    public readonly name: string;
    public readonly category: BenchmarkCategory;
    public readonly startTime: number;
    public readonly options: BenchmarkOptions;
    
    private operationCount = 0;
    private errorCount = 0;
    private memoryPeak = 0;
    private startMemory: number;

    constructor(name: string, category: BenchmarkCategory, options: BenchmarkOptions) {
        this.name = name;
        this.category = category;
        this.startTime = performance.now();
        this.options = options;
        this.startMemory = process.memoryUsage().heapUsed;
        this.memoryPeak = this.startMemory;
    }

    recordOperation(type: string): void {
        this.operationCount++;
        this.updateMemoryPeak();
    }

    recordError(): void {
        this.errorCount++;
    }

    updateMemoryPeak(currentMemory?: number): void {
        const memory = currentMemory || process.memoryUsage().heapUsed;
        this.memoryPeak = Math.max(this.memoryPeak, memory);
    }

    end(): BenchmarkResult {
        const endTime = performance.now();
        const duration = endTime - this.startTime;
        const endMemory = process.memoryUsage().heapUsed;

        return {
            name: this.name,
            category: this.category,
            startTime: this.startTime,
            endTime,
            duration,
            operationCount: this.operationCount,
            errorCount: this.errorCount,
            memoryPeak: this.memoryPeak,
            memoryDelta: endMemory - this.startMemory,
            options: this.options
        };
    }
}

/**
 * System metrics collector for comprehensive performance analysis
 */
class SystemMetricsCollector {
    collectMetrics(): SystemMetrics {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            memory: {
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            timestamp: Date.now()
        };
    }
}

// Type definitions
export type BenchmarkCategory = 'general' | 'asset-parsing' | 'archive-reading' | 'comparative' | 'memory' | 'performance';

export interface BenchmarkOptions {
    description?: string;
    tags?: string[];
    collectSystemMetrics?: boolean;
}

export interface BenchmarkResult {
    name: string;
    category: BenchmarkCategory;
    startTime: number;
    endTime: number;
    duration: number; // milliseconds
    operationCount: number;
    errorCount: number;
    memoryPeak: number; // bytes
    memoryDelta: number; // bytes
    options: BenchmarkOptions;
}

export interface AssetParsingBenchmarkOptions extends BenchmarkOptions {
    warmupRuns?: number;
    includeDetailedResults?: boolean;
}

export interface AssetParsingBenchmarkResult extends BenchmarkResult {
    assetType: string;
    assetCount: number;
    successCount: number;
    errorCount: number;
    successRate: number; // percentage
    averageParseTime: number; // milliseconds
    minParseTime: number; // milliseconds
    maxParseTime: number; // milliseconds
    totalMemoryUsed: number; // bytes
    averageMemoryPerAsset: number; // bytes
    throughput: number; // assets per second
    detailedResults?: Array<{ name: string; duration: number; success: boolean; memoryDelta: number }>;
}

export interface ArchiveBenchmarkOptions extends BenchmarkOptions {
    maxFiles?: number;
    includeDetailedResults?: boolean;
}

export interface ArchiveOperationResult {
    operation: string;
    duration: number;
    fileCount: number;
    bytes: number;
    success: boolean;
    fileName?: string;
    error?: string;
}

export interface ArchiveBenchmarkResult extends BenchmarkResult {
    archivePath: string;
    totalFiles: number;
    filesRead: number;
    successfulReads: number;
    totalBytes: number;
    averageReadTime: number; // milliseconds
    throughputMBps: number; // MB per second
    operationResults?: ArchiveOperationResult[];
}

export interface ComparativeBenchmarkOptions extends BenchmarkOptions {
    iterations?: number;
}

export interface ApproachResult {
    name: string;
    totalTime: number;
    averageTime: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    memoryPeak: number;
    throughput: number;
    relativePerformance?: number;
    performanceRatio?: number;
}

export interface ComparativeBenchmarkResult {
    name: string;
    testDataSize: number;
    approaches: ApproachResult[];
    bestApproach: string;
    worstApproach: string;
}

export interface SystemMetrics {
    memory: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
    };
    cpu: {
        user: number;
        system: number;
    };
    timestamp: number;
}

export interface BenchmarkReport {
    totalBenchmarks: number;
    categories: BenchmarkCategory[];
    summary: {
        totalDuration: number;
        averageDuration: number;
        totalOperations: number;
        averageMemoryPeak: number;
    };
    recommendations: string[];
}

/**
 * Factory function to create a new benchmark instance
 */
export function createBenchmark(): AssetParsingBenchmark {
    return new AssetParsingBenchmark();
}

/**
 * Global benchmark instance for convenience
 */
export const globalBenchmark = new AssetParsingBenchmark();