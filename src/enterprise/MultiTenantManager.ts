import { EventEmitter } from 'events';
import { DatabaseIntegration } from './DatabaseIntegration';

/**
 * Multi-Tenant Support for unpak.js Enterprise Features
 * Phase 12 - Multi-tenant architecture for enterprise deployment
 * 
 * This module provides:
 * - Tenant isolation and resource management
 * - Session management and authentication
 * - Resource quotas and billing tracking
 * - Custom tenant configurations
 * - Monitoring and alerting per tenant
 */

export interface ITenantConfiguration {
    tenantId: string;
    name: string;
    plan: 'free' | 'professional' | 'enterprise';
    billingEmail: string;
    ipWhitelist?: string[];
    maxConcurrentSessions?: number;
    sessionTimeout?: number; // seconds
    resourceLimits: {
        maxMemoryMb: number;
        maxStorageMb: number;
        maxCpuCores: number;
        maxApiCallsPerHour: number;
        maxArchivesPerUser: number;
    };
    features: {
        enableAdvancedFeatures: boolean;
        enableExport: boolean;
        enableBulkOperations: boolean;
        enableAnalytics: boolean;
        enableCustomPlugins: boolean;
    };
    customSettings?: Record<string, any>;
    createdAt: Date;
    lastUpdated: Date;
    isActive: boolean;
}

export interface ITenantSession {
    sessionId: string;
    tenantId: string;
    userId?: string;
    ipAddress: string;
    userAgent?: string;
    createdAt: Date;
    lastActivity: Date;
    isActive: boolean;
    sessionData?: Record<string, any>;
}

export interface ITenantUsage {
    tenantId: string;
    plan: string;
    currentUsage: {
        memoryMb: number;
        storageMb: number;
        cpuCores: number;
        activeSessions: number;
    };
    limits: {
        memoryMb: number;
        storageMb: number;
        cpuCores: number;
        maxSessions: number;
    };
    usagePercentages: {
        memory: number;
        storage: number;
        cpu: number;
        sessions: number;
    };
    billing: {
        apiCalls: number;
        computeTime: number; // milliseconds
        storageUsed: number; // MB
        lastBillingReset: Date;
    };
    lastUpdated: Date;
}

export interface IResourceOperation {
    memoryRequired: number;
    storageRequired?: number;
    cpuRequired?: number;
    estimatedDuration?: number;
}

export interface IResourceCheckResult {
    allowed: boolean;
    reason?: string;
    suggestions?: string[];
}

/**
 * Multi-tenant manager handles tenant lifecycle and resource management
 */
export class MultiTenantManager extends EventEmitter {
    private database: DatabaseIntegration;
    private tenants: Map<string, ITenantConfiguration> = new Map();
    private sessions: Map<string, ITenantSession> = new Map();
    private usage: Map<string, ITenantUsage> = new Map();
    private initialized = false;

    // Session cleanup interval
    private cleanupInterval?: NodeJS.Timeout;
    private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    private readonly DEFAULT_SESSION_TIMEOUT = 3600; // 1 hour

    constructor(database: DatabaseIntegration) {
        super();
        this.database = database;
    }

    async initialize(): Promise<void> {
        if (!this.database.isInitialized()) {
            await this.database.initialize();
        }

        // Start session cleanup
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSessions();
        }, this.CLEANUP_INTERVAL_MS);

        this.initialized = true;
        this.emit('initialized');
    }

    async shutdown(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        // Close all active sessions
        for (const session of this.sessions.values()) {
            await this.endSession(session.sessionId);
        }

        this.initialized = false;
        this.emit('shutdown');
    }

    /**
     * Create a new tenant
     */
    async createTenant(config: Omit<ITenantConfiguration, 'createdAt' | 'lastUpdated' | 'isActive'>): Promise<ITenantConfiguration> {
        this.ensureInitialized();

        if (this.tenants.has(config.tenantId)) {
            throw new Error(`Tenant with ID ${config.tenantId} already exists`);
        }

        const tenant: ITenantConfiguration = {
            ...config,
            createdAt: new Date(),
            lastUpdated: new Date(),
            isActive: true
        };

        // Create tenant schema in database
        await this.database.createTenantSchema(config.tenantId);

        // Store tenant configuration
        this.tenants.set(config.tenantId, tenant);

        // Initialize usage tracking
        this.usage.set(config.tenantId, this.createInitialUsage(tenant));

        this.emit('tenantCreated', tenant);
        return tenant;
    }

    /**
     * Get tenant configuration
     */
    getTenant(tenantId: string): ITenantConfiguration | null {
        return this.tenants.get(tenantId) || null;
    }

    /**
     * Update tenant configuration
     */
    async updateTenant(tenantId: string, updates: Partial<ITenantConfiguration>): Promise<boolean> {
        this.ensureInitialized();

        const tenant = this.tenants.get(tenantId);
        if (!tenant) {
            return false;
        }

        const updatedTenant = {
            ...tenant,
            ...updates,
            lastUpdated: new Date()
        };

        this.tenants.set(tenantId, updatedTenant);
        this.emit('tenantUpdated', updatedTenant);
        return true;
    }

    /**
     * Delete tenant and all associated data
     */
    async deleteTenant(tenantId: string): Promise<boolean> {
        this.ensureInitialized();

        const tenant = this.tenants.get(tenantId);
        if (!tenant) {
            return false;
        }

        // End all sessions for this tenant
        const tenantSessions = Array.from(this.sessions.values())
            .filter(session => session.tenantId === tenantId);
        
        for (const session of tenantSessions) {
            await this.endSession(session.sessionId);
        }

        // Delete all tenant data from database
        await this.database.deleteTenantData(tenantId);

        // Remove from local state
        this.tenants.delete(tenantId);
        this.usage.delete(tenantId);

        this.emit('tenantDeleted', tenantId);
        return true;
    }

    /**
     * Create a new session for a tenant
     */
    async createSession(tenantId: string, ipAddress: string, userId?: string, userAgent?: string): Promise<ITenantSession> {
        this.ensureInitialized();

        const tenant = this.tenants.get(tenantId);
        if (!tenant || !tenant.isActive) {
            throw new Error(`Tenant ${tenantId} not found or inactive`);
        }

        // Check IP whitelist
        if (tenant.ipWhitelist && tenant.ipWhitelist.length > 0) {
            if (!this.isIpAllowed(ipAddress, tenant.ipWhitelist)) {
                throw new Error(`IP address ${ipAddress} not allowed for tenant ${tenantId}`);
            }
        }

        // Check concurrent session limit
        const activeSessions = this.getActiveSessions(tenantId);
        const maxSessions = tenant.maxConcurrentSessions || 10;
        if (activeSessions.length >= maxSessions) {
            throw new Error(`Maximum concurrent sessions (${maxSessions}) reached for tenant ${tenantId}`);
        }

        const sessionId = this.generateSessionId();
        const session: ITenantSession = {
            sessionId,
            tenantId,
            userId,
            ipAddress,
            userAgent,
            createdAt: new Date(),
            lastActivity: new Date(),
            isActive: true
        };

        this.sessions.set(sessionId, session);
        this.updateResourceUsage(tenantId, { activeSessions: activeSessions.length + 1 });

        this.emit('sessionCreated', session);
        return session;
    }

    /**
     * Update session activity
     */
    async updateSessionActivity(sessionId: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session || !session.isActive) {
            return false;
        }

        session.lastActivity = new Date();
        this.emit('sessionActivity', session);
        return true;
    }

    /**
     * End a session
     */
    async endSession(sessionId: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }

        session.isActive = false;
        this.sessions.delete(sessionId);

        // Update usage tracking
        const activeSessions = this.getActiveSessions(session.tenantId);
        this.updateResourceUsage(session.tenantId, { activeSessions: activeSessions.length });

        this.emit('sessionEnded', session);
        return true;
    }

    /**
     * Get active sessions for a tenant
     */
    getActiveSessions(tenantId: string): ITenantSession[] {
        return Array.from(this.sessions.values())
            .filter(session => session.tenantId === tenantId && session.isActive);
    }

    /**
     * Check if a resource operation is allowed for a tenant
     */
    checkResourceLimits(tenantId: string, operation: IResourceOperation): IResourceCheckResult {
        const tenant = this.tenants.get(tenantId);
        const usage = this.usage.get(tenantId);

        if (!tenant || !usage) {
            return { allowed: false, reason: 'Tenant not found' };
        }

        const limits = tenant.resourceLimits;
        const current = usage.currentUsage;

        // Check memory
        if (current.memoryMb + operation.memoryRequired > limits.maxMemoryMb) {
            return {
                allowed: false,
                reason: `Memory limit exceeded. Required: ${operation.memoryRequired}MB, Available: ${limits.maxMemoryMb - current.memoryMb}MB`,
                suggestions: ['Consider upgrading your plan', 'Close other operations to free memory']
            };
        }

        // Check storage
        if (operation.storageRequired && current.storageMb + operation.storageRequired > limits.maxStorageMb) {
            return {
                allowed: false,
                reason: `Storage limit exceeded. Required: ${operation.storageRequired}MB, Available: ${limits.maxStorageMb - current.storageMb}MB`,
                suggestions: ['Clean up old assets', 'Upgrade your storage plan']
            };
        }

        // Check CPU
        if (operation.cpuRequired && current.cpuCores + operation.cpuRequired > limits.maxCpuCores) {
            return {
                allowed: false,
                reason: `CPU limit exceeded. Required: ${operation.cpuRequired} cores, Available: ${limits.maxCpuCores - current.cpuCores} cores`,
                suggestions: ['Wait for other operations to complete', 'Upgrade your plan']
            };
        }

        return { allowed: true };
    }

    /**
     * Update resource usage for a tenant
     */
    updateResourceUsage(tenantId: string, updates: Partial<ITenantUsage['currentUsage']>): void {
        const usage = this.usage.get(tenantId);
        const tenant = this.tenants.get(tenantId);

        if (!usage || !tenant) {
            return;
        }

        // Update current usage
        Object.assign(usage.currentUsage, updates);
        usage.lastUpdated = new Date();

        // Calculate percentages
        const limits = tenant.resourceLimits;
        usage.usagePercentages = {
            memory: (usage.currentUsage.memoryMb / limits.maxMemoryMb) * 100,
            storage: (usage.currentUsage.storageMb / limits.maxStorageMb) * 100,
            cpu: (usage.currentUsage.cpuCores / limits.maxCpuCores) * 100,
            sessions: (usage.currentUsage.activeSessions / (tenant.maxConcurrentSessions || 10)) * 100
        };

        // Emit warnings for high usage
        for (const [resource, percentage] of Object.entries(usage.usagePercentages)) {
            if (percentage > 80) {
                this.emit('resourceWarning', {
                    tenantId,
                    resource,
                    percentage,
                    usage: usage.currentUsage
                });
            }
        }

        this.emit('usageUpdated', { tenantId, usage });
    }

    /**
     * Get tenant usage information
     */
    getTenantUsage(tenantId: string): ITenantUsage | null {
        return this.usage.get(tenantId) || null;
    }

    /**
     * Track API call for billing
     */
    trackApiCall(tenantId: string, computeTimeMs: number = 0): void {
        const usage = this.usage.get(tenantId);
        if (usage) {
            usage.billing.apiCalls++;
            usage.billing.computeTime += computeTimeMs;
            usage.lastUpdated = new Date();
        }
    }

    /**
     * Reset billing counters (typically done monthly)
     */
    resetBillingCounters(tenantId: string): void {
        const usage = this.usage.get(tenantId);
        if (usage) {
            usage.billing.apiCalls = 0;
            usage.billing.computeTime = 0;
            usage.billing.lastBillingReset = new Date();
            this.emit('billingReset', tenantId);
        }
    }

    /**
     * List all tenants
     */
    listTenants(): ITenantConfiguration[] {
        return Array.from(this.tenants.values());
    }

    /**
     * Get tenant by session ID
     */
    getTenantBySession(sessionId: string): ITenantConfiguration | null {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }
        return this.tenants.get(session.tenantId) || null;
    }

    private ensureInitialized(): void {
        if (!this.initialized) {
            throw new Error('MultiTenantManager not initialized');
        }
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private isIpAllowed(ipAddress: string, whitelist: string[]): boolean {
        // Simple IP matching - in production, should support CIDR ranges
        return whitelist.includes(ipAddress) || whitelist.some(range => {
            if (range.includes('/')) {
                // CIDR range matching would go here
                return false;
            }
            return range === ipAddress;
        });
    }

    private createInitialUsage(tenant: ITenantConfiguration): ITenantUsage {
        return {
            tenantId: tenant.tenantId,
            plan: tenant.plan,
            currentUsage: {
                memoryMb: 0,
                storageMb: 0,
                cpuCores: 0,
                activeSessions: 0
            },
            limits: {
                memoryMb: tenant.resourceLimits.maxMemoryMb,
                storageMb: tenant.resourceLimits.maxStorageMb,
                cpuCores: tenant.resourceLimits.maxCpuCores,
                maxSessions: tenant.maxConcurrentSessions || 10
            },
            usagePercentages: {
                memory: 0,
                storage: 0,
                cpu: 0,
                sessions: 0
            },
            billing: {
                apiCalls: 0,
                computeTime: 0,
                storageUsed: 0,
                lastBillingReset: new Date()
            },
            lastUpdated: new Date()
        };
    }

    private async cleanupExpiredSessions(): Promise<void> {
        const now = new Date();
        const expiredSessions: string[] = [];

        for (const [sessionId, session] of this.sessions.entries()) {
            const tenant = this.tenants.get(session.tenantId);
            const timeout = (tenant?.sessionTimeout || this.DEFAULT_SESSION_TIMEOUT) * 1000;
            
            if (now.getTime() - session.lastActivity.getTime() > timeout) {
                expiredSessions.push(sessionId);
            }
        }

        for (const sessionId of expiredSessions) {
            await this.endSession(sessionId);
        }

        if (expiredSessions.length > 0) {
            this.emit('sessionsCleanedUp', expiredSessions.length);
        }
    }
}

/**
 * Predefined tenant plan configurations
 */
export const TENANT_PLANS = {
    free: {
        resourceLimits: {
            maxMemoryMb: 512,
            maxStorageMb: 1024,
            maxCpuCores: 1,
            maxApiCallsPerHour: 100,
            maxArchivesPerUser: 3
        },
        features: {
            enableAdvancedFeatures: false,
            enableExport: true,
            enableBulkOperations: false,
            enableAnalytics: false,
            enableCustomPlugins: false
        },
        maxConcurrentSessions: 2,
        sessionTimeout: 1800 // 30 minutes
    },
    professional: {
        resourceLimits: {
            maxMemoryMb: 4096,
            maxStorageMb: 10240,
            maxCpuCores: 4,
            maxApiCallsPerHour: 1000,
            maxArchivesPerUser: 20
        },
        features: {
            enableAdvancedFeatures: true,
            enableExport: true,
            enableBulkOperations: true,
            enableAnalytics: true,
            enableCustomPlugins: false
        },
        maxConcurrentSessions: 10,
        sessionTimeout: 7200 // 2 hours
    },
    enterprise: {
        resourceLimits: {
            maxMemoryMb: 16384,
            maxStorageMb: 102400,
            maxCpuCores: 16,
            maxApiCallsPerHour: 10000,
            maxArchivesPerUser: 100
        },
        features: {
            enableAdvancedFeatures: true,
            enableExport: true,
            enableBulkOperations: true,
            enableAnalytics: true,
            enableCustomPlugins: true
        },
        maxConcurrentSessions: 50,
        sessionTimeout: 14400 // 4 hours
    }
} as const;

/**
 * Helper function to create tenant with predefined plan
 */
export function createTenantWithPlan(
    tenantId: string,
    name: string,
    billingEmail: string,
    plan: keyof typeof TENANT_PLANS,
    customSettings?: Record<string, any>
): Omit<ITenantConfiguration, 'createdAt' | 'lastUpdated' | 'isActive'> {
    const planConfig = TENANT_PLANS[plan];
    
    return {
        tenantId,
        name,
        plan,
        billingEmail,
        resourceLimits: planConfig.resourceLimits,
        features: planConfig.features,
        maxConcurrentSessions: planConfig.maxConcurrentSessions,
        sessionTimeout: planConfig.sessionTimeout,
        customSettings
    };
}