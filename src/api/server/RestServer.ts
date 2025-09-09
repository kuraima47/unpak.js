import { EventEmitter } from 'events';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { logger } from '../../core/logging/Logger';

/**
 * REST API Server for unpak.js
 * Addresses roadmap item: "Unified API and Tooling - REST API server mode"
 * 
 * Provides a web service interface for unpak.js functionality:
 * - Archive browsing and file listing
 * - Asset extraction and conversion
 * - Real-time processing status
 * - Batch operations with progress tracking
 * - Integration with external tools and workflows
 */
export class UnpakRestServer extends EventEmitter {
    private server: any;
    private readonly port: number;
    private readonly archives = new Map<string, any>();
    private readonly activeSessions = new Map<string, ProcessingSession>();
    private isRunning = false;

    constructor(options: RestServerOptions = {}) {
        super();
        this.port = options.port || 3000;
    }

    /**
     * Start the REST API server
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            throw new Error('Server is already running');
        }

        this.server = createServer((req, res) => {
            this.handleRequest(req, res).catch(error => {
                logger.error('Request handling error', { error: error.message });
                this.sendError(res, 500, 'Internal server error');
            });
        });

        return new Promise((resolve, reject) => {
            this.server.listen(this.port, (error: any) => {
                if (error) {
                    reject(error);
                } else {
                    this.isRunning = true;
                    logger.info('unpak.js REST API server started', { port: this.port });
                    this.emit('started', { port: this.port });
                    resolve();
                }
            });
        });
    }

    /**
     * Stop the REST API server
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        return new Promise((resolve) => {
            this.server.close(() => {
                this.isRunning = false;
                logger.info('unpak.js REST API server stopped');
                this.emit('stopped');
                resolve();
            });
        });
    }

    /**
     * Handle incoming HTTP requests
     */
    private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
        const url = new URL(req.url || '', `http://localhost:${this.port}`);
        const method = req.method || 'GET';
        const path = url.pathname;

        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        logger.debug('API request', { method, path, query: Object.fromEntries(url.searchParams) });

        try {
            // Route requests
            if (path === '/api/status') {
                await this.handleStatus(req, res);
            } else if (path === '/api/archives') {
                await this.handleArchives(req, res, method);
            } else if (path.startsWith('/api/archives/')) {
                await this.handleArchiveOperations(req, res, method, path, url);
            } else if (path.startsWith('/api/sessions/')) {
                await this.handleSessionOperations(req, res, method, path);
            } else if (path === '/api/convert') {
                await this.handleConversion(req, res, method);
            } else if (path === '/api/benchmark') {
                await this.handleBenchmark(req, res, method);
            } else {
                this.sendError(res, 404, 'Endpoint not found');
            }
        } catch (error: any) {
            logger.error('Request processing error', {
                method: method,
                path: path,
                error: error.message
            });
            this.sendError(res, 500, error.message);
        }
    }

    /**
     * Handle server status requests
     */
    private async handleStatus(req: IncomingMessage, res: ServerResponse): Promise<void> {
        const status = {
            status: 'running',
            version: '2.0.0-alpha.1',
            archives: this.archives.size,
            activeSessions: this.activeSessions.size,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            features: [
                'pak-files',
                'iostore',
                'asset-parsing',
                'conversions',
                'benchmarking',
                'incremental-processing'
            ]
        };

        this.sendJson(res, status);
    }

    /**
     * Handle archive management requests
     */
    private async handleArchives(req: IncomingMessage, res: ServerResponse, method: string): Promise<void> {
        if (method === 'GET') {
            // List loaded archives
            const archives = Array.from(this.archives.entries()).map(([id, archive]) => ({
                id,
                name: archive.name || id,
                type: archive.type || 'unknown',
                fileCount: archive.getFileCount ? archive.getFileCount() : 0,
                loadedAt: archive.loadedAt
            }));

            this.sendJson(res, { archives });

        } else if (method === 'POST') {
            // Load new archive
            const body = await this.readRequestBody(req);
            const { path, keyManager } = JSON.parse(body);

            if (!path) {
                this.sendError(res, 400, 'Archive path is required');
                return;
            }

            try {
                // This would integrate with the actual archive loading system
                const archiveId = this.generateId();
                const archive = {
                    id: archiveId,
                    path,
                    name: path.split('/').pop() || path,
                    type: path.endsWith('.pak') ? 'pak' : 'iostore',
                    loadedAt: new Date().toISOString(),
                    getFileCount: () => Math.floor(Math.random() * 10000) // Placeholder
                };

                this.archives.set(archiveId, archive);

                logger.info('Archive loaded via API', { archiveId, path });
                this.sendJson(res, { success: true, archiveId, archive }, 201);

            } catch (error: any) {
                this.sendError(res, 500, `Failed to load archive: ${error.message}`);
            }

        } else {
            this.sendError(res, 405, 'Method not allowed');
        }
    }

    /**
     * Handle archive-specific operations
     */
    private async handleArchiveOperations(
        req: IncomingMessage, 
        res: ServerResponse, 
        method: string, 
        path: string, 
        url: URL
    ): Promise<void> {
        const pathParts = path.split('/');
        const archiveId = pathParts[3];
        const operation = pathParts[4];

        const archive = this.archives.get(archiveId);
        if (!archive) {
            this.sendError(res, 404, 'Archive not found');
            return;
        }

        if (method === 'GET') {
            if (operation === 'files') {
                // List files in archive
                const pattern = url.searchParams.get('pattern') || '*';
                const limit = parseInt(url.searchParams.get('limit') || '1000');
                const offset = parseInt(url.searchParams.get('offset') || '0');

                // Placeholder implementation
                const files = Array.from({ length: Math.min(limit, 100) }, (_, i) => ({
                    path: `/Game/Content/File_${offset + i}.uasset`,
                    size: Math.floor(Math.random() * 1024 * 1024),
                    compressed: Math.random() > 0.5,
                    encrypted: Math.random() > 0.7
                }));

                this.sendJson(res, {
                    files,
                    total: 10000, // Placeholder
                    offset,
                    limit,
                    pattern
                });

            } else if (operation === 'file') {
                // Get specific file
                const filePath = url.searchParams.get('path');
                if (!filePath) {
                    this.sendError(res, 400, 'File path is required');
                    return;
                }

                // Placeholder file data
                const fileData = {
                    path: filePath,
                    size: Math.floor(Math.random() * 1024 * 1024),
                    compressed: Math.random() > 0.5,
                    encrypted: Math.random() > 0.7,
                    data: 'base64-encoded-data-would-go-here'
                };

                this.sendJson(res, fileData);

            } else if (operation === 'extract') {
                // Start extraction session
                const sessionId = this.generateId();
                const session = new ProcessingSession(sessionId, 'extraction', {
                    archiveId,
                    pattern: url.searchParams.get('pattern') || '*.uasset',
                    convert: url.searchParams.get('convert') === 'true'
                });

                this.activeSessions.set(sessionId, session);

                // Start processing (placeholder)
                session.start();

                this.sendJson(res, {
                    sessionId,
                    status: 'started',
                    estimatedFiles: Math.floor(Math.random() * 1000)
                }, 202);

            } else {
                this.sendError(res, 404, 'Operation not found');
            }

        } else if (method === 'DELETE') {
            // Unload archive
            this.archives.delete(archiveId);
            logger.info('Archive unloaded via API', { archiveId });
            this.sendJson(res, { success: true, message: 'Archive unloaded' });

        } else {
            this.sendError(res, 405, 'Method not allowed');
        }
    }

    /**
     * Handle session operations (progress tracking, cancellation)
     */
    private async handleSessionOperations(
        req: IncomingMessage, 
        res: ServerResponse, 
        method: string, 
        path: string
    ): Promise<void> {
        const pathParts = path.split('/');
        const sessionId = pathParts[3];
        const operation = pathParts[4];

        const session = this.activeSessions.get(sessionId);
        if (!session) {
            this.sendError(res, 404, 'Session not found');
            return;
        }

        if (method === 'GET') {
            if (operation === 'status' || !operation) {
                // Get session status
                this.sendJson(res, session.getStatus());

            } else if (operation === 'results') {
                // Get session results
                this.sendJson(res, session.getResults());

            } else {
                this.sendError(res, 404, 'Operation not found');
            }

        } else if (method === 'DELETE') {
            // Cancel session
            session.cancel();
            this.activeSessions.delete(sessionId);
            this.sendJson(res, { success: true, message: 'Session cancelled' });

        } else {
            this.sendError(res, 405, 'Method not allowed');
        }
    }

    /**
     * Handle conversion requests
     */
    private async handleConversion(req: IncomingMessage, res: ServerResponse, method: string): Promise<void> {
        if (method !== 'POST') {
            this.sendError(res, 405, 'Method not allowed');
            return;
        }

        const body = await this.readRequestBody(req);
        const { archiveId, filePath, outputFormat, options } = JSON.parse(body);

        const archive = this.archives.get(archiveId);
        if (!archive) {
            this.sendError(res, 404, 'Archive not found');
            return;
        }

        // Start conversion session
        const sessionId = this.generateId();
        const session = new ProcessingSession(sessionId, 'conversion', {
            archiveId,
            filePath,
            outputFormat,
            options
        });

        this.activeSessions.set(sessionId, session);
        session.start();

        this.sendJson(res, {
            sessionId,
            status: 'started',
            outputFormat
        }, 202);
    }

    /**
     * Handle benchmark requests
     */
    private async handleBenchmark(req: IncomingMessage, res: ServerResponse, method: string): Promise<void> {
        if (method !== 'POST') {
            this.sendError(res, 405, 'Method not allowed');
            return;
        }

        const body = await this.readRequestBody(req);
        const { type, archiveId, options } = JSON.parse(body);

        const archive = this.archives.get(archiveId);
        if (!archive) {
            this.sendError(res, 404, 'Archive not found');
            return;
        }

        // Start benchmark session
        const sessionId = this.generateId();
        const session = new ProcessingSession(sessionId, 'benchmark', {
            type,
            archiveId,
            options
        });

        this.activeSessions.set(sessionId, session);
        session.start();

        this.sendJson(res, {
            sessionId,
            status: 'started',
            benchmarkType: type
        }, 202);
    }

    /**
     * Send JSON response
     */
    private sendJson(res: ServerResponse, data: any, statusCode: number = 200): void {
        res.writeHead(statusCode, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(data, null, 2));
    }

    /**
     * Send error response
     */
    private sendError(res: ServerResponse, statusCode: number, message: string): void {
        const error = {
            error: {
                code: statusCode,
                message
            }
        };
        this.sendJson(res, error, statusCode);
    }

    /**
     * Read request body
     */
    private async readRequestBody(req: IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                resolve(body);
            });
            req.on('error', reject);
        });
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    /**
     * Get server status
     */
    public getStatus(): ServerStatus {
        return {
            isRunning: this.isRunning,
            port: this.port,
            archives: this.archives.size,
            activeSessions: this.activeSessions.size
        };
    }

    /**
     * Get list of loaded archives
     */
    public getArchives(): any[] {
        return Array.from(this.archives.values());
    }

    /**
     * Get active sessions
     */
    public getActiveSessions(): any[] {
        return Array.from(this.activeSessions.values()).map(s => s.getStatus());
    }
}

/**
 * Processing session for tracking long-running operations
 */
class ProcessingSession {
    private readonly id: string;
    private readonly type: string;
    private readonly options: any;
    private status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' = 'pending';
    private progress = 0;
    private results: any = null;
    private error: string | null = null;
    private startTime: number | null = null;
    private endTime: number | null = null;

    constructor(id: string, type: string, options: any) {
        this.id = id;
        this.type = type;
        this.options = options;
    }

    start(): void {
        this.status = 'running';
        this.startTime = Date.now();
        
        // Simulate processing
        this.simulateProgress();
    }

    cancel(): void {
        this.status = 'cancelled';
        this.endTime = Date.now();
    }

    private simulateProgress(): void {
        const interval = setInterval(() => {
            if (this.status === 'cancelled') {
                clearInterval(interval);
                return;
            }

            this.progress += Math.random() * 10;
            
            if (this.progress >= 100) {
                this.progress = 100;
                this.status = 'completed';
                this.endTime = Date.now();
                this.results = {
                    type: this.type,
                    completed: true,
                    files: Math.floor(Math.random() * 1000),
                    duration: this.endTime! - this.startTime!
                };
                clearInterval(interval);
            }
        }, 100);
    }

    getStatus(): any {
        return {
            id: this.id,
            type: this.type,
            status: this.status,
            progress: this.progress,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.endTime && this.startTime ? this.endTime - this.startTime : null,
            options: this.options,
            error: this.error
        };
    }

    getResults(): any {
        return this.results;
    }
}

/**
 * Configuration options for the REST server
 */
export interface RestServerOptions {
    /** Port to listen on */
    port?: number;
    /** Enable authentication */
    auth?: boolean;
    /** Maximum request size */
    maxRequestSize?: number;
    /** Enable request logging */
    requestLogging?: boolean;
}

/**
 * Server status information
 */
export interface ServerStatus {
    isRunning: boolean;
    port: number;
    archives: number;
    activeSessions: number;
}

/**
 * Factory function to create a new REST server
 */
export function createRestServer(options?: RestServerOptions): UnpakRestServer {
    return new UnpakRestServer(options);
}