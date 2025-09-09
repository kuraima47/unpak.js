/**
 * Phase 10: Advanced File Systems - Async Loading Manager
 * 
 * Manages prioritized async loading of assets with worker thread support
 * and intelligent preloading based on usage patterns.
 */

import { VirtualFileSystem, LoadPriority } from './VirtualFileSystem';
import { EventEmitter } from 'events';

/**
 * Loading job configuration
 */
export interface ILoadJob {
    /** Unique job ID */
    id: string;
    /** File paths to load */
    filePaths: string[];
    /** Loading priority */
    priority: LoadPriority;
    /** Creation timestamp */
    createdAt: number;
    /** Optional metadata */
    metadata?: Record<string, any>;
}

/**
 * Loading job result
 */
export interface ILoadResult {
    /** Job ID */
    jobId: string;
    /** Success status */
    success: boolean;
    /** Loaded file data map */
    data: Map<string, Buffer>;
    /** Failed file paths */
    failed: string[];
    /** Load duration in ms */
    duration: number;
    /** Optional error */
    error?: Error;
}

/**
 * Preload pattern for intelligent caching
 */
export interface IPreloadPattern {
    /** Pattern name */
    name: string;
    /** File path patterns to match */
    patterns: RegExp[];
    /** Trigger conditions */
    triggers: string[];
    /** Priority for preloaded files */
    priority: LoadPriority;
    /** Maximum files to preload */
    maxFiles?: number;
}

/**
 * Async Loading Manager with intelligent preloading
 * 
 * Features:
 * - Priority-based job queue
 * - Batch loading with progress tracking
 * - Intelligent preloading based on patterns
 * - Load balancing across multiple worker threads
 * - Performance metrics and optimization
 */
export class AsyncLoadingManager extends EventEmitter {
    private vfs: VirtualFileSystem;
    private jobQueue: ILoadJob[] = [];
    private activeJobs: Map<string, ILoadJob> = new Map();
    private completedJobs: Map<string, ILoadResult> = new Map();
    private preloadPatterns: IPreloadPattern[] = [];
    private maxConcurrentJobs: number;
    private isProcessing: boolean = false;
    
    // Usage tracking for intelligent preloading
    private accessPatterns: Map<string, number> = new Map();
    private lastAccessTime: Map<string, number> = new Map();
    
    // Performance metrics
    private metrics = {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        totalLoadTime: 0,
        averageLoadTime: 0,
        preloadHits: 0,
        preloadMisses: 0
    };

    constructor(vfs: VirtualFileSystem, maxConcurrentJobs: number = 4) {
        super();
        this.vfs = vfs;
        this.maxConcurrentJobs = maxConcurrentJobs;
        
        // Setup default preload patterns
        this.setupDefaultPreloadPatterns();
        
        // Start processing jobs
        this.processJobs();
    }

    /**
     * Queue a loading job
     */
    queueJob(filePaths: string[], priority: LoadPriority = LoadPriority.NORMAL, metadata?: Record<string, any>): string {
        const jobId = this.generateJobId();
        const job: ILoadJob = {
            id: jobId,
            filePaths: [...filePaths],
            priority,
            createdAt: Date.now(),
            metadata
        };

        this.jobQueue.push(job);
        this.sortJobQueue();
        this.metrics.totalJobs++;

        this.emit('jobQueued', job);
        return jobId;
    }

    /**
     * Load files synchronously (returns immediately available data)
     */
    loadSync(filePaths: string[]): Map<string, Buffer> {
        const result = new Map<string, Buffer>();
        
        for (const filePath of filePaths) {
            const data = this.vfs.getFileSync(filePath);
            if (data) {
                result.set(filePath, data);
                this.trackAccess(filePath);
            }
        }

        return result;
    }

    /**
     * Load files asynchronously with priority
     */
    async loadAsync(filePaths: string[], priority: LoadPriority = LoadPriority.NORMAL): Promise<Map<string, Buffer>> {
        const jobId = this.queueJob(filePaths, priority);
        
        return new Promise((resolve, reject) => {
            const onComplete = (result: ILoadResult) => {
                if (result.jobId === jobId) {
                    this.removeListener('jobCompleted', onComplete);
                    this.removeListener('jobFailed', onFailed);
                    
                    if (result.success) {
                        resolve(result.data);
                    } else {
                        reject(result.error || new Error('Load job failed'));
                    }
                }
            };

            const onFailed = (result: ILoadResult) => {
                if (result.jobId === jobId) {
                    this.removeListener('jobCompleted', onComplete);
                    this.removeListener('jobFailed', onFailed);
                    reject(result.error || new Error('Load job failed'));
                }
            };

            this.on('jobCompleted', onComplete);
            this.on('jobFailed', onFailed);
        });
    }

    /**
     * Add a preload pattern
     */
    addPreloadPattern(pattern: IPreloadPattern): void {
        this.preloadPatterns.push(pattern);
    }

    /**
     * Remove a preload pattern
     */
    removePreloadPattern(name: string): boolean {
        const index = this.preloadPatterns.findIndex(p => p.name === name);
        if (index >= 0) {
            this.preloadPatterns.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Trigger preloading based on file access
     */
    triggerPreload(triggerFile: string): void {
        for (const pattern of this.preloadPatterns) {
            if (pattern.triggers.some(trigger => triggerFile.includes(trigger))) {
                this.executePreload(pattern);
            }
        }
    }

    /**
     * Get job status
     */
    getJobStatus(jobId: string): 'queued' | 'active' | 'completed' | 'failed' | 'not_found' {
        if (this.completedJobs.has(jobId)) {
            const result = this.completedJobs.get(jobId)!;
            return result.success ? 'completed' : 'failed';
        }
        if (this.activeJobs.has(jobId)) {
            return 'active';
        }
        if (this.jobQueue.some(job => job.id === jobId)) {
            return 'queued';
        }
        return 'not_found';
    }

    /**
     * Cancel a queued job
     */
    cancelJob(jobId: string): boolean {
        const queueIndex = this.jobQueue.findIndex(job => job.id === jobId);
        if (queueIndex >= 0) {
            this.jobQueue.splice(queueIndex, 1);
            this.emit('jobCancelled', jobId);
            return true;
        }
        return false;
    }

    /**
     * Get performance metrics
     */
    getMetrics(): typeof this.metrics & { queueLength: number; activeJobs: number } {
        return {
            ...this.metrics,
            queueLength: this.jobQueue.length,
            activeJobs: this.activeJobs.size
        };
    }

    /**
     * Clear completed job history
     */
    clearHistory(): void {
        this.completedJobs.clear();
    }

    // Private methods

    private async processJobs(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        while (true) {
            // Check if we can start more jobs
            if (this.activeJobs.size >= this.maxConcurrentJobs || this.jobQueue.length === 0) {
                await this.sleep(10); // Wait 10ms before checking again
                continue;
            }

            // Get highest priority job
            const job = this.jobQueue.shift();
            if (!job) {
                continue;
            }

            // Start the job
            this.activeJobs.set(job.id, job);
            this.emit('jobStarted', job);

            // Process job asynchronously
            this.processJob(job).catch(error => {
                console.error(`Error processing job ${job.id}:`, error);
                this.completeJob(job, false, new Map(), job.filePaths, error);
            });
        }
    }

    private async processJob(job: ILoadJob): Promise<void> {
        const startTime = Date.now();
        const data = new Map<string, Buffer>();
        const failed: string[] = [];

        try {
            // Load files in parallel batches
            const batchSize = 10; // Process 10 files at a time
            for (let i = 0; i < job.filePaths.length; i += batchSize) {
                const batch = job.filePaths.slice(i, i + batchSize);
                const batchPromises = batch.map(async (filePath) => {
                    try {
                        const fileData = await this.vfs.getFileAsync(filePath, job.priority);
                        if (fileData) {
                            data.set(filePath, fileData);
                            this.trackAccess(filePath);
                            return { filePath, success: true };
                        } else {
                            failed.push(filePath);
                            return { filePath, success: false };
                        }
                    } catch (error) {
                        failed.push(filePath);
                        return { filePath, success: false, error };
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                
                // Emit progress
                const progress = (i + batch.length) / job.filePaths.length;
                this.emit('jobProgress', {
                    jobId: job.id,
                    progress,
                    loaded: data.size,
                    failed: failed.length,
                    total: job.filePaths.length
                });
            }

            const duration = Date.now() - startTime;
            const success = failed.length === 0;
            
            this.completeJob(job, success, data, failed, undefined, duration);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.completeJob(job, false, data, job.filePaths, error as Error, duration);
        }
    }

    private completeJob(job: ILoadJob, success: boolean, data: Map<string, Buffer>, failed: string[], error?: Error, duration?: number): void {
        const finalDuration = duration || (Date.now() - job.createdAt);
        
        const result: ILoadResult = {
            jobId: job.id,
            success,
            data,
            failed,
            duration: finalDuration,
            error
        };

        this.activeJobs.delete(job.id);
        this.completedJobs.set(job.id, result);

        // Update metrics
        if (success) {
            this.metrics.completedJobs++;
        } else {
            this.metrics.failedJobs++;
        }
        this.metrics.totalLoadTime += finalDuration;
        this.metrics.averageLoadTime = this.metrics.totalLoadTime / (this.metrics.completedJobs + this.metrics.failedJobs);

        // Emit completion event
        if (success) {
            this.emit('jobCompleted', result);
        } else {
            this.emit('jobFailed', result);
        }

        // Trigger preloading if this was a successful load
        if (success && data.size > 0) {
            for (const filePath of data.keys()) {
                this.triggerPreload(filePath);
            }
        }
    }

    private sortJobQueue(): void {
        this.jobQueue.sort((a, b) => {
            // Higher priority first
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            // Earlier created first for same priority
            return a.createdAt - b.createdAt;
        });
    }

    private executePreload(pattern: IPreloadPattern): void {
        try {
            const candidateFiles = this.vfs.listFiles();
            const matchingFiles: string[] = [];

            for (const file of candidateFiles) {
                if (pattern.patterns.some(regex => regex.test(file))) {
                    matchingFiles.push(file);
                    if (pattern.maxFiles && matchingFiles.length >= pattern.maxFiles) {
                        break;
                    }
                }
            }

            if (matchingFiles.length > 0) {
                // Queue preload job with lower priority
                const preloadPriority = Math.max(LoadPriority.LOW, pattern.priority - 1);
                this.queueJob(matchingFiles, preloadPriority, { preload: true, pattern: pattern.name });
            }
        } catch (error) {
            console.warn(`Failed to execute preload pattern ${pattern.name}:`, error);
        }
    }

    private trackAccess(filePath: string): void {
        const now = Date.now();
        this.accessPatterns.set(filePath, (this.accessPatterns.get(filePath) || 0) + 1);
        this.lastAccessTime.set(filePath, now);
    }

    private generateJobId(): string {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private setupDefaultPreloadPatterns(): void {
        // Preload related texture files when loading a material
        this.addPreloadPattern({
            name: 'material_textures',
            patterns: [/\.uasset$/i, /\.utexture$/i],
            triggers: ['.umaterial', '.umat'],
            priority: LoadPriority.NORMAL,
            maxFiles: 20
        });

        // Preload related mesh files when loading a skeletal mesh
        this.addPreloadPattern({
            name: 'skeletal_mesh_parts',
            patterns: [/\.uasset$/i, /\.umesh$/i],
            triggers: ['.uskeletalmesh', '.uskel'],
            priority: LoadPriority.NORMAL,
            maxFiles: 10
        });

        // Preload audio files when loading a sound bank
        this.addPreloadPattern({
            name: 'audio_bank_sounds',
            patterns: [/\.wem$/i, /\.ogg$/i, /\.wav$/i],
            triggers: ['.bnk', '.soundbank'],
            priority: LoadPriority.LOW,
            maxFiles: 50
        });
    }
}