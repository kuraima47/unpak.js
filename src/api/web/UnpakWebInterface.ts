import { EventEmitter } from 'events';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { URL } from 'url';
import { logger } from '../../core/logging/Logger';

/**
 * Unpak.js Web Interface - FModel-like browser interface
 * Roadmap Phase 12: "Interface web similaire à FModel"
 * 
 * Features:
 * - Asset browser with tree view
 * - Real-time asset preview
 * - Search and filtering
 * - Batch operations
 * - Performance monitoring
 * - Export capabilities
 */
export class UnpakWebInterface extends EventEmitter {
    private server: any;
    private readonly port: number;
    private readonly apiPort: number;
    private isRunning = false;

    constructor(options: WebInterfaceOptions = {}) {
        super();
        this.port = options.port || 8080;
        this.apiPort = options.apiPort || 3000;
    }

    /**
     * Start the web interface server
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            throw new Error('Web interface is already running');
        }

        this.server = createServer((req, res) => {
            this.handleRequest(req, res).catch(error => {
                logger.error('Web interface request error', { 
                    error: error.message,
                    stack: error.stack 
                });
                this.sendError(res, 500, 'Internal server error');
            });
        });

        return new Promise((resolve, reject) => {
            this.server.listen(this.port, (error: any) => {
                if (error) {
                    reject(error);
                } else {
                    this.isRunning = true;
                    logger.info('unpak.js Web Interface started', { 
                        port: this.port,
                        url: `http://localhost:${this.port}`
                    });
                    resolve();
                }
            });
        });
    }

    /**
     * Stop the web interface server
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        return new Promise((resolve) => {
            this.server.close(() => {
                this.isRunning = false;
                logger.info('unpak.js Web Interface stopped');
                resolve();
            });
        });
    }

    /**
     * Handle incoming HTTP requests
     */
    private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
        const url = new URL(req.url!, `http://localhost:${this.port}`);
        const path = url.pathname;

        // Set CORS headers for development
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        try {
            // Serve static web interface files
            if (path === '/' || path === '/index.html') {
                this.serveHTML(res, this.generateMainHTML());
            } else if (path === '/js/app.js') {
                this.serveJS(res, this.generateMainJS());
            } else if (path === '/css/app.css') {
                this.serveCSS(res, this.generateMainCSS());
            } else if (path.startsWith('/api/')) {
                // Proxy API requests to the REST server
                await this.proxyToAPI(req, res, path);
            } else if (path === '/preview') {
                await this.handleAssetPreview(req, res, url);
            } else if (path === '/download') {
                await this.handleAssetDownload(req, res, url);
            } else {
                this.sendError(res, 404, 'Page not found');
            }
        } catch (error: any) {
            logger.error('Web interface error', { 
                path: path, 
                error: error.message,
                stack: error.stack 
            });
            this.sendError(res, 500, error.message);
        }
    }

    /**
     * Generate main HTML page
     */
    private generateMainHTML(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>unpak.js - Unreal Engine Asset Browser</title>
    <link rel="stylesheet" href="/css/app.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <div id="app">
        <!-- Header -->
        <header class="header">
            <div class="header-content">
                <h1><i class="fas fa-cube"></i> unpak.js</h1>
                <div class="header-actions">
                    <button id="load-archive-btn" class="btn btn-primary">
                        <i class="fas fa-folder-open"></i> Load Archive
                    </button>
                    <button id="settings-btn" class="btn btn-secondary">
                        <i class="fas fa-cog"></i> Settings
                    </button>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Sidebar -->
            <aside class="sidebar">
                <div class="sidebar-section">
                    <h3><i class="fas fa-archive"></i> Archives</h3>
                    <div id="archives-list" class="archives-list">
                        <!-- Archives will be loaded here -->
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3><i class="fas fa-search"></i> Search</h3>
                    <div class="search-container">
                        <input type="text" id="asset-search" placeholder="Search assets..." class="search-input">
                        <div class="search-filters">
                            <select id="asset-type-filter">
                                <option value="">All Types</option>
                                <option value="Texture2D">Textures</option>
                                <option value="StaticMesh">Meshes</option>
                                <option value="Material">Materials</option>
                                <option value="SoundWave">Sounds</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3><i class="fas fa-chart-bar"></i> Statistics</h3>
                    <div id="statistics" class="statistics">
                        <!-- Statistics will be loaded here -->
                    </div>
                </div>
            </aside>

            <!-- Content Area -->
            <main class="content">
                <div class="content-header">
                    <div class="breadcrumb">
                        <span id="breadcrumb-path">Select an archive to begin</span>
                    </div>
                    <div class="view-controls">
                        <button id="tree-view-btn" class="btn btn-sm active">
                            <i class="fas fa-sitemap"></i> Tree
                        </button>
                        <button id="list-view-btn" class="btn btn-sm">
                            <i class="fas fa-list"></i> List
                        </button>
                        <button id="grid-view-btn" class="btn btn-sm">
                            <i class="fas fa-th"></i> Grid
                        </button>
                    </div>
                </div>

                <div class="content-body">
                    <div id="asset-browser" class="asset-browser">
                        <!-- Asset browser will be loaded here -->
                    </div>
                </div>
            </main>

            <!-- Preview Panel -->
            <aside class="preview-panel" id="preview-panel">
                <div class="preview-header">
                    <h3><i class="fas fa-eye"></i> Asset Preview</h3>
                    <button id="close-preview-btn" class="btn btn-sm">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="preview-content" id="preview-content">
                    <div class="no-preview">
                        <i class="fas fa-image"></i>
                        <p>Select an asset to preview</p>
                    </div>
                </div>
                <div class="preview-actions">
                    <button id="export-asset-btn" class="btn btn-primary" disabled>
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button id="copy-path-btn" class="btn btn-secondary" disabled>
                        <i class="fas fa-copy"></i> Copy Path
                    </button>
                </div>
            </aside>
        </div>

        <!-- Status Bar -->
        <footer class="status-bar">
            <div class="status-info">
                <span id="status-text">Ready</span>
            </div>
            <div class="status-stats">
                <span id="memory-usage">Memory: --</span>
                <span id="performance-stats">Performance: --</span>
            </div>
        </footer>
    </div>

    <!-- Load Archive Modal -->
    <div id="load-archive-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Load Archive</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="load-archive-form">
                    <div class="form-group">
                        <label for="archive-path">Archive Path:</label>
                        <input type="text" id="archive-path" required placeholder="/path/to/archive.pak">
                    </div>
                    <div class="form-group">
                        <label for="encryption-key">Encryption Key (optional):</label>
                        <input type="text" id="encryption-key" placeholder="0x...">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="cancel-load">Cancel</button>
                <button type="submit" form="load-archive-form" class="btn btn-primary">Load Archive</button>
            </div>
        </div>
    </div>

    <script src="/js/app.js"></script>
</body>
</html>`;
    }

    /**
     * Generate main JavaScript application (truncated for brevity)
     */
    private generateMainJS(): string {
        return `
class UnpakWebApp {
    constructor() {
        this.apiUrl = 'http://localhost:${this.apiPort}';
        this.currentArchive = null;
        this.currentAsset = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadArchives();
        this.startStatusPolling();
    }

    bindEvents() {
        // Implementation details...
        console.log('UnpakWebApp initialized');
    }

    async loadArchives() {
        try {
            const response = await fetch(\`\${this.apiUrl}/api/archives\`);
            const data = await response.json();
            this.renderArchives(data.archives || []);
        } catch (error) {
            console.error('Failed to load archives:', error);
        }
    }

    renderArchives(archives) {
        const container = document.getElementById('archives-list');
        container.innerHTML = archives.length ? 
            archives.map(a => \`<div class="archive-item">\${a.name}</div>\`).join('') :
            '<div class="no-archives">No archives loaded</div>';
    }

    updateStatus(message) {
        document.getElementById('status-text').textContent = message;
    }

    async startStatusPolling() {
        setInterval(async () => {
            try {
                const response = await fetch(\`\${this.apiUrl}/api/status\`);
                const status = await response.json();
                document.getElementById('memory-usage').textContent = 
                    \`Memory: \${Math.round(status.memory?.heapUsed / 1024 / 1024) || 0}MB\`;
            } catch (error) {
                // Silently fail for status polling
            }
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new UnpakWebApp();
});
`;
    }

    /**
     * Generate main CSS styles (truncated for brevity)
     */
    private generateMainCSS(): string {
        return `
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1a1a1a;
    color: #e0e0e0;
    height: 100vh;
    overflow: hidden;
}

#app {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

.header {
    background: #2d2d2d;
    border-bottom: 1px solid #404040;
    padding: 12px 20px;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header h1 {
    color: #4fc3f7;
    font-size: 1.5rem;
    font-weight: 600;
}

.main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.sidebar {
    width: 300px;
    background: #252525;
    border-right: 1px solid #404040;
    overflow-y: auto;
    padding: 15px;
}

.content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.preview-panel {
    width: 400px;
    background: #252525;
    border-left: 1px solid #404040;
    display: none;
    flex-direction: column;
}

.btn {
    background: #404040;
    border: 1px solid #555;
    border-radius: 6px;
    padding: 8px 16px;
    color: #e0e0e0;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn.btn-primary {
    background: #4fc3f7;
    border-color: #29b6f6;
    color: #000;
}

.status-bar {
    background: #2d2d2d;
    border-top: 1px solid #404040;
    padding: 8px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: #b0b0b0;
}

.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: #2d2d2d;
    border: 1px solid #404040;
    border-radius: 8px;
    width: 500px;
    max-width: 90vw;
}
`;
    }

    /**
     * Handle asset preview requests
     */
    private async handleAssetPreview(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
        const archiveId = url.searchParams.get('archive');
        const assetPath = url.searchParams.get('asset');

        if (!archiveId || !assetPath) {
            this.sendError(res, 400, 'Archive ID and asset path are required');
            return;
        }

        // For now, return placeholder preview data
        this.sendJson(res, {
            type: 'preview',
            assetPath,
            archiveId,
            preview: 'Preview functionality will be implemented with actual asset parsing'
        });
    }

    /**
     * Handle asset download requests
     */
    private async handleAssetDownload(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
        const archiveId = url.searchParams.get('archive');
        const assetPath = url.searchParams.get('asset');

        if (!archiveId || !assetPath) {
            this.sendError(res, 400, 'Archive ID and asset path are required');
            return;
        }

        // For now, return placeholder download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="asset.bin"`);
        res.writeHead(200);
        res.end(Buffer.from('Placeholder asset data'));
    }

    /**
     * Proxy API requests to the REST server
     */
    private async proxyToAPI(req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
        try {
            // For now, return mock API responses
            if (path === '/api/status') {
                this.sendJson(res, {
                    status: 'running',
                    version: '2.0.0-alpha.1',
                    memory: { heapUsed: 50 * 1024 * 1024 },
                    uptime: 3600
                });
            } else if (path === '/api/archives') {
                this.sendJson(res, {
                    archives: []
                });
            } else {
                this.sendError(res, 404, 'API endpoint not implemented');
            }
        } catch (error: any) {
            this.sendError(res, 500, `API proxy error: ${error.message}`);
        }
    }

    /**
     * Serve HTML content
     */
    private serveHTML(res: ServerResponse, html: string): void {
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.end(html);
    }

    /**
     * Serve JavaScript content
     */
    private serveJS(res: ServerResponse, js: string): void {
        res.setHeader('Content-Type', 'application/javascript');
        res.writeHead(200);
        res.end(js);
    }

    /**
     * Serve CSS content
     */
    private serveCSS(res: ServerResponse, css: string): void {
        res.setHeader('Content-Type', 'text/css');
        res.writeHead(200);
        res.end(css);
    }

    /**
     * Send JSON response
     */
    private sendJson(res: ServerResponse, data: any, statusCode: number = 200): void {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(statusCode);
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
     * Get server status
     */
    public getStatus(): { isRunning: boolean; port: number; apiPort: number } {
        return {
            isRunning: this.isRunning,
            port: this.port,
            apiPort: this.apiPort
        };
    }
}

/**
 * Web Interface Options
 */
export interface WebInterfaceOptions {
    port?: number;
    apiPort?: number;
}