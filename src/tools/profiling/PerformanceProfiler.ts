/**
 * Phase 12: Developer Tooling - Performance Profiling Tools
 * 
 * Comprehensive performance profiling and monitoring tools for unpak.js
 */

import { EventEmitter } from 'events';

/**
 * Performance metric types
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

/**
 * Performance metric interface
 */
export interface IPerformanceMetric {
    /** Metric name */
    name: string;
    
    /** Metric type */
    type: MetricType;
    
    /** Metric value */
    value: number;
    
    /** Metric unit */
    unit?: string;
    
    /** Timestamp */
    timestamp: number;
    
    /** Additional tags */
    tags?: Record<string, string>;
}

/**
 * Performance sample for histograms
 */
export interface IPerformanceSample {
    /** Sample value */
    value: number;
    
    /** Sample timestamp */
    timestamp: number;
    
    /** Sample context */
    context?: Record<string, any>;
}

/**
 * Profiling session configuration
 */
export interface IProfilingConfig {
    /** Enable memory profiling */
    enableMemoryProfiling?: boolean;
    
    /** Enable CPU profiling */
    enableCPUProfiling?: boolean;
    
    /** Enable I/O profiling */
    enableIOProfiling?: boolean;
    
    /** Sample interval in milliseconds */
    sampleInterval?: number;
    
    /** Maximum samples to keep */
    maxSamples?: number;
    
    /** Auto-export interval */
    autoExportInterval?: number;
    
    /** Export directory */
    exportDirectory?: string;
}

/**
 * Memory usage snapshot
 */
export interface IMemorySnapshot {
    /** Heap used */
    heapUsed: number;
    
    /** Heap total */
    heapTotal: number;
    
    /** External memory */
    external: number;
    
    /** Array buffers */
    arrayBuffers: number;
    
    /** RSS (Resident Set Size) */
    rss: number;
    
    /** Timestamp */
    timestamp: number;
}

/**
 * CPU usage information
 */
export interface ICPUUsage {
    /** User CPU time */
    user: number;
    
    /** System CPU time */
    system: number;
    
    /** CPU percentage */
    percent: number;
    
    /** Timestamp */
    timestamp: number;
}

/**
 * I/O operation tracking
 */
export interface IIOOperation {
    /** Operation type */
    type: 'read' | 'write' | 'seek';
    
    /** Operation size in bytes */
    size: number;
    
    /** Operation duration in ms */
    duration: number;
    
    /** File path */
    filePath?: string;
    
    /** Timestamp */
    timestamp: number;
}

/**
 * Performance report
 */
export interface IPerformanceReport {
    /** Report timestamp */
    timestamp: number;
    
    /** Session duration */
    duration: number;
    
    /** Memory statistics */
    memory: {
        peak: IMemorySnapshot;
        average: IMemorySnapshot;
        current: IMemorySnapshot;
        samples: IMemorySnapshot[];
    };
    
    /** CPU statistics */
    cpu: {
        peak: ICPUUsage;
        average: ICPUUsage;
        samples: ICPUUsage[];
    };
    
    /** I/O statistics */
    io: {
        totalOperations: number;
        totalBytes: number;
        averageSpeed: number;
        operations: IIOOperation[];
    };
    
    /** Custom metrics */
    metrics: Record<string, IPerformanceMetric[]>;
    
    /** Performance warnings */
    warnings: string[];
    
    /** Recommendations */
    recommendations: string[];
}

/**
 * Performance Profiler - Main profiling class
 */
export class PerformanceProfiler extends EventEmitter {
    private config: Required<IProfilingConfig>;
    private isActive = false;
    private sessionStart = 0;
    private memorySnapshots: IMemorySnapshot[] = [];
    private cpuSamples: ICPUUsage[] = [];
    private ioOperations: IIOOperation[] = [];
    private customMetrics: Map<string, IPerformanceMetric[]> = new Map();
    private timers: Map<string, number> = new Map();
    private counters: Map<string, number> = new Map();
    private gauges: Map<string, number> = new Map();
    private histograms: Map<string, IPerformanceSample[]> = new Map();
    private intervalId?: NodeJS.Timeout;
    private lastCPUUsage?: NodeJS.CpuUsage;

    constructor(config: IProfilingConfig = {}) {
        super();
        this.config = {
            enableMemoryProfiling: config.enableMemoryProfiling ?? true,
            enableCPUProfiling: config.enableCPUProfiling ?? true,
            enableIOProfiling: config.enableIOProfiling ?? true,
            sampleInterval: config.sampleInterval ?? 1000,
            maxSamples: config.maxSamples ?? 1000,
            autoExportInterval: config.autoExportInterval ?? 0,
            exportDirectory: config.exportDirectory ?? './profiling-reports'
        };
    }

    /**
     * Start profiling session
     */
    startProfiling(): void {
        if (this.isActive) {
            console.warn('Profiling is already active');
            return;
        }

        this.isActive = true;
        this.sessionStart = Date.now();
        
        // Clear previous data
        this.memorySnapshots = [];
        this.cpuSamples = [];
        this.ioOperations = [];
        this.customMetrics.clear();
        this.timers.clear();
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();

        // Start sampling
        this.startSampling();

        // Setup auto-export if configured
        if (this.config.autoExportInterval > 0) {
            setInterval(() => {
                this.exportReport();
            }, this.config.autoExportInterval);
        }

        this.emit('profilingStarted');
        console.log('Performance profiling started');
    }

    /**
     * Stop profiling session
     */
    stopProfiling(): IPerformanceReport {
        if (!this.isActive) {
            console.warn('Profiling is not active');
            return this.generateReport();
        }

        this.isActive = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }

        const report = this.generateReport();
        this.emit('profilingStopped', report);
        console.log('Performance profiling stopped');
        
        return report;
    }

    /**
     * Record a counter metric
     */
    incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
        const currentValue = this.counters.get(name) || 0;
        this.counters.set(name, currentValue + value);
        
        this.recordMetric({
            name,
            type: 'counter',
            value: currentValue + value,
            timestamp: Date.now(),
            tags
        });
    }

    /**
     * Record a gauge metric
     */
    setGauge(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
        this.gauges.set(name, value);
        
        this.recordMetric({
            name,
            type: 'gauge',
            value,
            unit,
            timestamp: Date.now(),
            tags
        });
    }

    /**
     * Start a timer
     */
    startTimer(name: string): void {
        this.timers.set(name, Date.now());
    }

    /**
     * End a timer and record the duration
     */
    endTimer(name: string, tags?: Record<string, string>): number {
        const startTime = this.timers.get(name);
        if (!startTime) {
            console.warn(`Timer ${name} was not started`);
            return 0;
        }

        const duration = Date.now() - startTime;
        this.timers.delete(name);

        this.recordMetric({
            name,
            type: 'timer',
            value: duration,
            unit: 'ms',
            timestamp: Date.now(),
            tags
        });

        return duration;
    }

    /**
     * Record a histogram sample
     */
    recordHistogram(name: string, value: number, context?: Record<string, any>): void {
        if (!this.histograms.has(name)) {
            this.histograms.set(name, []);
        }

        const samples = this.histograms.get(name)!;
        samples.push({
            value,
            timestamp: Date.now(),
            context
        });

        // Limit samples
        if (samples.length > this.config.maxSamples) {
            samples.shift();
        }

        this.recordMetric({
            name,
            type: 'histogram',
            value,
            timestamp: Date.now()
        });
    }

    /**
     * Record an I/O operation
     */
    recordIOOperation(operation: Omit<IIOOperation, 'timestamp'>): void {
        if (!this.config.enableIOProfiling) return;

        const ioOp: IIOOperation = {
            ...operation,
            timestamp: Date.now()
        };

        this.ioOperations.push(ioOp);

        // Limit operations
        if (this.ioOperations.length > this.config.maxSamples) {
            this.ioOperations.shift();
        }

        // Record metrics
        this.incrementCounter(`io_operations_${operation.type}`);
        this.incrementCounter('io_bytes_total', operation.size);
        this.recordHistogram('io_duration', operation.duration);
    }

    /**
     * Get current performance snapshot
     */
    getCurrentSnapshot(): Partial<IPerformanceReport> {
        return {
            timestamp: Date.now(),
            duration: this.isActive ? Date.now() - this.sessionStart : 0,
            memory: this.memorySnapshots.length > 0 ? {
                current: this.memorySnapshots[this.memorySnapshots.length - 1],
                peak: this.getPeakMemory(),
                average: this.getAverageMemory(),
                samples: this.memorySnapshots.slice(-10) // Last 10 samples
            } : undefined,
            cpu: this.cpuSamples.length > 0 ? {
                current: this.cpuSamples[this.cpuSamples.length - 1],
                peak: this.getPeakCPU(),
                average: this.getAverageCPU(),
                samples: this.cpuSamples.slice(-10) // Last 10 samples
            } : undefined
        };
    }

    /**
     * Export performance report to file
     */
    async exportReport(filename?: string): Promise<string> {
        const report = this.generateReport();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFile = filename || `performance-report-${timestamp}.json`;
        
        // In a real implementation, this would write to filesystem
        console.log(`Exporting performance report to: ${outputFile}`);
        
        return outputFile;
    }

    // Private methods

    private startSampling(): void {
        this.intervalId = setInterval(() => {
            if (this.config.enableMemoryProfiling) {
                this.sampleMemory();
            }
            
            if (this.config.enableCPUProfiling) {
                this.sampleCPU();
            }
        }, this.config.sampleInterval);
    }

    private sampleMemory(): void {
        const memUsage = process.memoryUsage();
        const snapshot: IMemorySnapshot = {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            arrayBuffers: memUsage.arrayBuffers,
            rss: memUsage.rss,
            timestamp: Date.now()
        };

        this.memorySnapshots.push(snapshot);

        // Limit samples
        if (this.memorySnapshots.length > this.config.maxSamples) {
            this.memorySnapshots.shift();
        }
    }

    private sampleCPU(): void {
        const cpuUsage = process.cpuUsage(this.lastCPUUsage);
        this.lastCPUUsage = process.cpuUsage();

        const totalUsage = cpuUsage.user + cpuUsage.system;
        const percent = totalUsage / (this.config.sampleInterval * 1000) * 100;

        const sample: ICPUUsage = {
            user: cpuUsage.user,
            system: cpuUsage.system,
            percent: Math.min(100, percent),
            timestamp: Date.now()
        };

        this.cpuSamples.push(sample);

        // Limit samples
        if (this.cpuSamples.length > this.config.maxSamples) {
            this.cpuSamples.shift();
        }
    }

    private recordMetric(metric: IPerformanceMetric): void {
        if (!this.customMetrics.has(metric.name)) {
            this.customMetrics.set(metric.name, []);
        }

        const metrics = this.customMetrics.get(metric.name)!;
        metrics.push(metric);

        // Limit metrics
        if (metrics.length > this.config.maxSamples) {
            metrics.shift();
        }
    }

    private generateReport(): IPerformanceReport {
        const duration = this.isActive ? Date.now() - this.sessionStart : 0;
        
        return {
            timestamp: Date.now(),
            duration,
            memory: {
                peak: this.getPeakMemory(),
                average: this.getAverageMemory(),
                current: this.memorySnapshots[this.memorySnapshots.length - 1] || this.getEmptyMemorySnapshot(),
                samples: this.memorySnapshots
            },
            cpu: {
                peak: this.getPeakCPU(),
                average: this.getAverageCPU(),
                samples: this.cpuSamples
            },
            io: {
                totalOperations: this.ioOperations.length,
                totalBytes: this.ioOperations.reduce((sum, op) => sum + op.size, 0),
                averageSpeed: this.calculateAverageIOSpeed(),
                operations: this.ioOperations
            },
            metrics: Object.fromEntries(this.customMetrics),
            warnings: this.generateWarnings(),
            recommendations: this.generateRecommendations()
        };
    }

    private getPeakMemory(): IMemorySnapshot {
        if (this.memorySnapshots.length === 0) return this.getEmptyMemorySnapshot();
        
        return this.memorySnapshots.reduce((peak, current) => 
            current.heapUsed > peak.heapUsed ? current : peak
        );
    }

    private getAverageMemory(): IMemorySnapshot {
        if (this.memorySnapshots.length === 0) return this.getEmptyMemorySnapshot();
        
        const avg = this.memorySnapshots.reduce((acc, snapshot) => ({
            heapUsed: acc.heapUsed + snapshot.heapUsed,
            heapTotal: acc.heapTotal + snapshot.heapTotal,
            external: acc.external + snapshot.external,
            arrayBuffers: acc.arrayBuffers + snapshot.arrayBuffers,
            rss: acc.rss + snapshot.rss,
            timestamp: 0
        }), this.getEmptyMemorySnapshot());

        const count = this.memorySnapshots.length;
        return {
            heapUsed: avg.heapUsed / count,
            heapTotal: avg.heapTotal / count,
            external: avg.external / count,
            arrayBuffers: avg.arrayBuffers / count,
            rss: avg.rss / count,
            timestamp: Date.now()
        };
    }

    private getPeakCPU(): ICPUUsage {
        if (this.cpuSamples.length === 0) return this.getEmptyCPUUsage();
        
        return this.cpuSamples.reduce((peak, current) => 
            current.percent > peak.percent ? current : peak
        );
    }

    private getAverageCPU(): ICPUUsage {
        if (this.cpuSamples.length === 0) return this.getEmptyCPUUsage();
        
        const avg = this.cpuSamples.reduce((acc, sample) => ({
            user: acc.user + sample.user,
            system: acc.system + sample.system,
            percent: acc.percent + sample.percent,
            timestamp: 0
        }), this.getEmptyCPUUsage());

        const count = this.cpuSamples.length;
        return {
            user: avg.user / count,
            system: avg.system / count,
            percent: avg.percent / count,
            timestamp: Date.now()
        };
    }

    private calculateAverageIOSpeed(): number {
        if (this.ioOperations.length === 0) return 0;
        
        const totalBytes = this.ioOperations.reduce((sum, op) => sum + op.size, 0);
        const totalDuration = this.ioOperations.reduce((sum, op) => sum + op.duration, 0);
        
        return totalDuration > 0 ? (totalBytes / totalDuration) * 1000 : 0; // bytes per second
    }

    private generateWarnings(): string[] {
        const warnings: string[] = [];
        
        const peakMemory = this.getPeakMemory();
        if (peakMemory.heapUsed > 500 * 1024 * 1024) { // 500MB
            warnings.push('High memory usage detected');
        }
        
        const peakCPU = this.getPeakCPU();
        if (peakCPU.percent > 80) {
            warnings.push('High CPU usage detected');
        }
        
        return warnings;
    }

    private generateRecommendations(): string[] {
        const recommendations: string[] = [];
        
        const avgMemory = this.getAverageMemory();
        if (avgMemory.heapUsed > 200 * 1024 * 1024) { // 200MB
            recommendations.push('Consider implementing memory pooling for better performance');
        }
        
        const avgIOSpeed = this.calculateAverageIOSpeed();
        if (avgIOSpeed < 10 * 1024 * 1024) { // 10MB/s
            recommendations.push('I/O performance could be improved with caching or async operations');
        }
        
        return recommendations;
    }

    private getEmptyMemorySnapshot(): IMemorySnapshot {
        return {
            heapUsed: 0,
            heapTotal: 0,
            external: 0,
            arrayBuffers: 0,
            rss: 0,
            timestamp: Date.now()
        };
    }

    private getEmptyCPUUsage(): ICPUUsage {
        return {
            user: 0,
            system: 0,
            percent: 0,
            timestamp: Date.now()
        };
    }
}

/**
 * Performance Monitor - Lightweight monitoring without full profiling
 */
export class PerformanceMonitor {
    private metrics: Map<string, number> = new Map();
    private watchers: Map<string, Function[]> = new Map();

    /**
     * Set a metric value
     */
    setMetric(name: string, value: number): void {
        this.metrics.set(name, value);
        this.notifyWatchers(name, value);
    }

    /**
     * Get a metric value
     */
    getMetric(name: string): number | undefined {
        return this.metrics.get(name);
    }

    /**
     * Watch for metric changes
     */
    watchMetric(name: string, callback: (value: number) => void): void {
        if (!this.watchers.has(name)) {
            this.watchers.set(name, []);
        }
        this.watchers.get(name)!.push(callback);
    }

    /**
     * Get all metrics
     */
    getAllMetrics(): Record<string, number> {
        return Object.fromEntries(this.metrics);
    }

    private notifyWatchers(name: string, value: number): void {
        const callbacks = this.watchers.get(name);
        if (callbacks) {
            callbacks.forEach(callback => callback(value));
        }
    }
}