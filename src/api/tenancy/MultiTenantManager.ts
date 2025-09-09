import { EventEmitter } from 'events';
import { logger } from '../../core/logging/Logger';
import { UnpakDatabaseProvider } from '../database/UnpakDatabaseProvider';

/**
 * Multi-Tenant Support for unpak.js Enterprise
 * Addresses roadmap item: "Enterprise Features - Support multi-tenant"
 * 
 * Enables isolated environments for multiple clients/organizations:
 * - Data isolation and security
 * - Resource allocation per tenant
 * - User management per tenant
 * - Custom configurations per tenant
 * - Usage tracking and billing support
 */
export class MultiTenantManager extends EventEmitter {
    private tenants: Map<string, TenantConfiguration> = new Map();
    private activeSessions: Map<string, TenantSession> = new Map();
    private resourceAllocations: Map<string, ResourceAllocation> = new Map();
    private readonly database: UnpakDatabaseProvider;
    
    constructor(database: UnpakDatabaseProvider) {
        super();
        this.database = database;
    }
    
    /**
     * Initialize multi-tenant system
     */
    async initialize(): Promise<void> {
        try {
            logger.info('Initializing multi-tenant system');
            
            // Load tenant configurations from database
            await this.loadTenantConfigurations();
            
            // Setup resource monitoring
            this.setupResourceMonitoring();
            
            this.emit('initialized');
            logger.info('Multi-tenant system initialized successfully');
            
        } catch (error: any) {
            logger.error('Failed to initialize multi-tenant system', undefined, { error: error.message });
            throw error;
        }
    }
    
    /**
     * Create a new tenant
     */
    async createTenant(config: CreateTenantRequest): Promise<TenantConfiguration> {
        if (this.tenants.has(config.tenantId)) {
            throw new Error(`Tenant ${config.tenantId} already exists`);
        }
        
        const tenant: TenantConfiguration = {
            tenantId: config.tenantId,
            name: config.name,
            description: config.description || '',
            plan: config.plan || 'basic',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            
            // Resource limits based on plan
            resourceLimits: this.getResourceLimitsForPlan(config.plan || 'basic'),
            
            // Default configuration
            settings: {
                enableAssetCaching: true,
                enablePerformanceMonitoring: true,
                enableAuditLogging: config.plan !== 'basic',
                maxArchiveSize: config.plan === 'enterprise' ? 1000 * 1024 * 1024 * 1024 : 100 * 1024 * 1024 * 1024, // 1TB or 100GB
                allowedFileTypes: ['*.pak', '*.ucas', '*.utoc'],
                ...config.customSettings
            },
            
            // Security settings
            security: {
                encryptionEnabled: config.plan !== 'basic',
                allowApiAccess: true,
                ipWhitelist: config.ipWhitelist || [],
                requireMfa: config.plan === 'enterprise',
                sessionTimeout: config.sessionTimeout || 3600
            },
            
            billing: {
                plan: config.plan || 'basic',
                billingEmail: config.billingEmail,
                usageTrackingEnabled: true,
                currentUsage: {
                    storageUsed: 0,
                    apiCalls: 0,
                    computeTime: 0
                }
            }
        };
        
        this.tenants.set(config.tenantId, tenant);
        
        // Initialize resource allocation
        this.resourceAllocations.set(config.tenantId, {
            tenantId: config.tenantId,
            allocatedMemory: tenant.resourceLimits.maxMemoryMB,
            allocatedStorage: tenant.resourceLimits.maxStorageGB,
            allocatedCpu: tenant.resourceLimits.maxCpuCores,
            currentUsage: {
                memoryUsed: 0,
                storageUsed: 0,
                cpuUsed: 0
            },
            lastUpdated: new Date().toISOString()
        });
        
        logger.info('Created new tenant', { tenantId: config.tenantId, plan: config.plan });
        this.emit('tenantCreated', { tenant });
        
        return tenant;
    }
    
    /**
     * Get tenant configuration
     */
    getTenant(tenantId: string): TenantConfiguration | undefined {
        return this.tenants.get(tenantId);
    }
    
    /**
     * Create authenticated session for tenant
     */
    async createSession(tenantId: string, userId: string, userAgent?: string): Promise<TenantSession> {
        const tenant = this.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant ${tenantId} not found`);
        }
        
        if (tenant.status !== 'active') {
            throw new Error(`Tenant ${tenantId} is not active`);
        }
        
        const sessionId = this.generateSessionId();
        const session: TenantSession = {
            sessionId,
            tenantId,
            userId,
            userAgent: userAgent || 'unknown',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + tenant.security.sessionTimeout * 1000).toISOString(),
            lastActivity: new Date().toISOString(),
            permissions: await this.getUserPermissions(tenantId, userId),
            resourceUsage: {
                memoryUsed: 0,
                storageUsed: 0,
                cpuUsed: 0,
                apiCalls: 0,
                computeTime: 0
            }
        };
        
        this.activeSessions.set(sessionId, session);
        
        logger.debug('Created tenant session', { sessionId, tenantId, userId });
        this.emit('sessionCreated', { session });
        
        return session;
    }
    
    /**
     * Validate session and check permissions
     */
    validateSession(sessionId: string, requiredPermission?: string): TenantSession {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Invalid session');
        }
        
        // Check expiration
        if (new Date() > new Date(session.expiresAt)) {
            this.activeSessions.delete(sessionId);
            throw new Error('Session expired');
        }
        
        // Check tenant status
        const tenant = this.getTenant(session.tenantId);
        if (!tenant || tenant.status !== 'active') {
            throw new Error('Tenant not active');
        }
        
        // Check permission if required
        if (requiredPermission && !session.permissions.includes(requiredPermission)) {
            throw new Error(`Permission denied: ${requiredPermission}`);
        }
        
        // Update last activity
        session.lastActivity = new Date().toISOString();
        
        return session;
    }
    
    /**
     * Check resource limits for tenant operation
     */
    checkResourceLimits(tenantId: string, operation: ResourceOperation): ResourceCheckResult {
        const tenant = this.getTenant(tenantId);
        const allocation = this.resourceAllocations.get(tenantId);
        
        if (!tenant || !allocation) {
            return { allowed: false, reason: 'Tenant not found' };
        }
        
        const limits = tenant.resourceLimits;
        const usage = allocation.currentUsage;
        
        // Check memory limit
        if (operation.memoryRequired && (usage.memoryUsed + operation.memoryRequired) > limits.maxMemoryMB) {
            return { 
                allowed: false, 
                reason: `Memory limit exceeded: ${usage.memoryUsed + operation.memoryRequired}MB > ${limits.maxMemoryMB}MB` 
            };
        }
        
        // Check storage limit
        if (operation.storageRequired && (usage.storageUsed + operation.storageRequired) > limits.maxStorageGB * 1024) {
            return { 
                allowed: false, 
                reason: `Storage limit exceeded: ${(usage.storageUsed + operation.storageRequired) / 1024}GB > ${limits.maxStorageGB}GB` 
            };
        }
        
        // Check concurrent operations
        const activeSessions = Array.from(this.activeSessions.values())
            .filter(s => s.tenantId === tenantId).length;
        
        if (activeSessions >= limits.maxConcurrentOperations) {
            return { 
                allowed: false, 
                reason: `Concurrent operations limit exceeded: ${activeSessions} >= ${limits.maxConcurrentOperations}` 
            };
        }
        
        return { allowed: true };
    }
    
    /**
     * Update resource usage for tenant
     */
    updateResourceUsage(tenantId: string, usage: Partial<ResourceUsage>): void {
        const allocation = this.resourceAllocations.get(tenantId);
        if (!allocation) return;
        
        if (usage.memoryUsed !== undefined) {
            allocation.currentUsage.memoryUsed = usage.memoryUsed;
        }
        if (usage.storageUsed !== undefined) {
            allocation.currentUsage.storageUsed = usage.storageUsed;
        }
        if (usage.cpuUsed !== undefined) {
            allocation.currentUsage.cpuUsed = usage.cpuUsed;
        }
        
        allocation.lastUpdated = new Date().toISOString();
        
        // Check if nearing limits and emit warnings
        this.checkUsageThresholds(tenantId, allocation);
    }
    
    /**
     * Get usage statistics for tenant
     */
    getTenantUsage(tenantId: string): TenantUsageReport | undefined {
        const tenant = this.getTenant(tenantId);
        const allocation = this.resourceAllocations.get(tenantId);
        
        if (!tenant || !allocation) return undefined;
        
        const activeSessions = Array.from(this.activeSessions.values())
            .filter(s => s.tenantId === tenantId);
        
        return {
            tenantId,
            reportGeneratedAt: new Date().toISOString(),
            plan: tenant.billing.plan,
            resourceLimits: tenant.resourceLimits,
            currentUsage: allocation.currentUsage,
            usagePercentages: {
                memory: (allocation.currentUsage.memoryUsed / tenant.resourceLimits.maxMemoryMB) * 100,
                storage: (allocation.currentUsage.storageUsed / 1024 / tenant.resourceLimits.maxStorageGB) * 100,
                cpu: (allocation.currentUsage.cpuUsed / tenant.resourceLimits.maxCpuCores) * 100
            },
            activeSessions: activeSessions.length,
            billing: tenant.billing.currentUsage
        };
    }
    
    private async loadTenantConfigurations(): Promise<void> {
        // In a real implementation, this would load from database
        logger.debug('Loading tenant configurations from database');
    }
    
    private setupResourceMonitoring(): void {
        // Monitor resource usage every 30 seconds
        setInterval(() => {
            this.monitorResourceUsage();
        }, 30000);
    }
    
    private monitorResourceUsage(): void {
        for (const [tenantId, allocation] of this.resourceAllocations) {
            // In a real implementation, this would collect actual resource metrics
            logger.debug('Monitoring resource usage', { tenantId, usage: allocation.currentUsage });
        }
    }
    
    private checkUsageThresholds(tenantId: string, allocation: ResourceAllocation): void {
        const tenant = this.getTenant(tenantId);
        if (!tenant) return;
        
        const limits = tenant.resourceLimits;
        const usage = allocation.currentUsage;
        
        // Check memory threshold (80%)
        const memoryPercent = (usage.memoryUsed / limits.maxMemoryMB) * 100;
        if (memoryPercent >= 80) {
            this.emit('resourceWarning', {
                tenantId,
                type: 'memory',
                percentage: memoryPercent,
                current: usage.memoryUsed,
                limit: limits.maxMemoryMB
            });
        }
        
        // Check storage threshold (90%)
        const storagePercent = (usage.storageUsed / 1024 / limits.maxStorageGB) * 100;
        if (storagePercent >= 90) {
            this.emit('resourceWarning', {
                tenantId,
                type: 'storage',
                percentage: storagePercent,
                current: usage.storageUsed / 1024,
                limit: limits.maxStorageGB
            });
        }
    }
    
    private getResourceLimitsForPlan(plan: string): ResourceLimits {
        switch (plan) {
            case 'basic':
                return {
                    maxMemoryMB: 2048,
                    maxStorageGB: 10,
                    maxCpuCores: 2,
                    maxConcurrentOperations: 5,
                    maxApiCallsPerHour: 1000
                };
            case 'professional':
                return {
                    maxMemoryMB: 8192,
                    maxStorageGB: 100,
                    maxCpuCores: 8,
                    maxConcurrentOperations: 20,
                    maxApiCallsPerHour: 10000
                };
            case 'enterprise':
                return {
                    maxMemoryMB: 32768,
                    maxStorageGB: 1000,
                    maxCpuCores: 32,
                    maxConcurrentOperations: 100,
                    maxApiCallsPerHour: 100000
                };
            default:
                return this.getResourceLimitsForPlan('basic');
        }
    }
    
    private async getUserPermissions(tenantId: string, userId: string): Promise<string[]> {
        // In a real implementation, this would query the database
        return ['read', 'write', 'admin']; // Default permissions
    }
    
    private generateSessionId(): string {
        return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
}

// Interfaces and types
export interface CreateTenantRequest {
    tenantId: string;
    name: string;
    description?: string;
    plan?: 'basic' | 'professional' | 'enterprise';
    billingEmail?: string;
    ipWhitelist?: string[];
    sessionTimeout?: number;
    customSettings?: Record<string, any>;
}

export interface TenantConfiguration {
    tenantId: string;
    name: string;
    description: string;
    plan: string;
    status: 'active' | 'suspended' | 'inactive';
    createdAt: string;
    updatedAt: string;
    resourceLimits: ResourceLimits;
    settings: TenantSettings;
    security: SecuritySettings;
    billing: BillingInfo;
}

export interface ResourceLimits {
    maxMemoryMB: number;
    maxStorageGB: number;
    maxCpuCores: number;
    maxConcurrentOperations: number;
    maxApiCallsPerHour: number;
}

export interface TenantSettings {
    enableAssetCaching: boolean;
    enablePerformanceMonitoring: boolean;
    enableAuditLogging: boolean;
    maxArchiveSize: number;
    allowedFileTypes: string[];
    [key: string]: any;
}

export interface SecuritySettings {
    encryptionEnabled: boolean;
    allowApiAccess: boolean;
    ipWhitelist: string[];
    requireMfa: boolean;
    sessionTimeout: number;
}

export interface BillingInfo {
    plan: string;
    billingEmail?: string;
    usageTrackingEnabled: boolean;
    currentUsage: BillingUsage;
}

export interface BillingUsage {
    storageUsed: number;
    apiCalls: number;
    computeTime: number;
}

export interface TenantSession {
    sessionId: string;
    tenantId: string;
    userId: string;
    userAgent: string;
    createdAt: string;
    expiresAt: string;
    lastActivity: string;
    permissions: string[];
    resourceUsage: ResourceUsage;
}

export interface ResourceUsage {
    memoryUsed: number;
    storageUsed: number;
    cpuUsed: number;
    apiCalls?: number;
    computeTime?: number;
}

export interface ResourceAllocation {
    tenantId: string;
    allocatedMemory: number;
    allocatedStorage: number;
    allocatedCpu: number;
    currentUsage: ResourceUsage;
    lastUpdated: string;
}

export interface ResourceOperation {
    memoryRequired?: number;
    storageRequired?: number;
    cpuRequired?: number;
}

export interface ResourceCheckResult {
    allowed: boolean;
    reason?: string;
}

export interface TenantUsageReport {
    tenantId: string;
    reportGeneratedAt: string;
    plan: string;
    resourceLimits: ResourceLimits;
    currentUsage: ResourceUsage;
    usagePercentages: {
        memory: number;
        storage: number;
        cpu: number;
    };
    activeSessions: number;
    billing: BillingUsage;
}