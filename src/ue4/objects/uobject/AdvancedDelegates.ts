import { FPackageIndex } from "./ObjectResource";
import { FName } from "./FName";
import { FAssetArchive } from "../../assets/reader/FAssetArchive";
import { FAssetArchiveWriter } from "../../assets/writer/FAssetArchiveWriter";
import { FScriptDelegate, FMulticastScriptDelegate } from "./ScriptDelegates";

/**
 * Enhanced Delegate Properties Support (Phase 3 - Complete Asset Property System)
 * Advanced delegate properties for Blueprint and C++ integration
 * Based on CUE4Parse delegate implementation
 */

/**
 * FDynamicDelegate - Dynamic delegate with runtime binding support
 * Used for Blueprint events and dynamic function bindings
 */
export class FDynamicDelegate extends FScriptDelegate {
    /** Delegate signature for type safety */
    public signature: string | null = null;
    
    /** Binding context for Blueprint integration */
    public bindingContext: string | null = null;
    
    /** Whether this delegate supports dynamic binding */
    public isDynamic: boolean = true;
    
    /** Delegate parameters metadata */
    public parameters: Map<string, string> = new Map();

    constructor(Ar?: FAssetArchive) {
        if (Ar) {
            super(Ar);
            this.signature = Ar.readString();
            this.bindingContext = Ar.readString();
            this.isDynamic = Ar.readBoolean();
            
            // Read parameters
            const paramCount = Ar.readInt32();
            for (let i = 0; i < paramCount; i++) {
                const paramName = Ar.readString();
                const paramType = Ar.readString();
                if (paramName && paramType) {
                    this.parameters.set(paramName, paramType);
                }
            }
        } else {
            super(new FPackageIndex(), new FName());
        }
    }

    /**
     * Serialize dynamic delegate data
     */
    serialize(Ar: FAssetArchiveWriter): void {
        super.serialize(Ar);
        Ar.writeString(this.signature || "");
        Ar.writeString(this.bindingContext || "");
        Ar.writeBoolean(this.isDynamic);
        
        // Write parameters
        Ar.writeInt32(this.parameters.size);
        for (const [name, type] of this.parameters) {
            Ar.writeString(name);
            Ar.writeString(type);
        }
    }

    /**
     * Check if delegate can be bound to a specific function
     */
    canBindToFunction(functionName: string, parameters: string[]): boolean {
        if (this.parameters.size !== parameters.length) {
            return false;
        }
        
        // Simple signature matching - in practice this would be more complex
        return this.signature?.includes(functionName) || false;
    }

    /**
     * Get delegate signature for Blueprint integration
     */
    getBlueprintSignature(): string {
        const params = Array.from(this.parameters.entries())
            .map(([name, type]) => `${type} ${name}`)
            .join(", ");
        return `${this.signature}(${params})`;
    }
}

/**
 * FMulticastDynamicDelegate - Multicast dynamic delegate
 * Supports multiple function bindings with event broadcasting
 */
export class FMulticastDynamicDelegate extends FMulticastScriptDelegate {
    /** Event signature for multicast delegates */
    public eventSignature: string | null = null;
    
    /** Blueprint event metadata */
    public eventMetadata: Map<string, any> = new Map();
    
    /** Execution order for bound functions */
    public executionOrder: number[] = [];
    
    /** Whether this delegate supports Blueprint events */
    public supportsBlueprints: boolean = true;

    constructor(Ar?: FAssetArchive) {
        if (Ar) {
            super(Ar);
            this.eventSignature = Ar.readString();
            this.supportsBlueprints = Ar.readBoolean();
            
            // Read event metadata
            const metadataCount = Ar.readInt32();
            for (let i = 0; i < metadataCount; i++) {
                const key = Ar.readString();
                const valueType = Ar.readString();
                let value: any = null;
                
                switch (valueType) {
                    case "string":
                        value = Ar.readString();
                        break;
                    case "int":
                        value = Ar.readInt32();
                        break;
                    case "bool":
                        value = Ar.readBoolean();
                        break;
                    case "float":
                        value = Ar.readFloat32();
                        break;
                    default:
                        value = Ar.readString();
                        break;
                }
                
                if (key) {
                    this.eventMetadata.set(key, value);
                }
            }
            
            // Read execution order
            const orderCount = Ar.readInt32();
            this.executionOrder = [];
            for (let i = 0; i < orderCount; i++) {
                this.executionOrder.push(Ar.readInt32());
            }
        } else {
            super([]);
        }
    }

    /**
     * Serialize multicast dynamic delegate data
     */
    serialize(Ar: FAssetArchiveWriter): void {
        super.serialize(Ar);
        Ar.writeString(this.eventSignature || "");
        Ar.writeBoolean(this.supportsBlueprints);
        
        // Write event metadata
        Ar.writeInt32(this.eventMetadata.size);
        for (const [key, value] of this.eventMetadata) {
            Ar.writeString(key);
            
            const valueType = typeof value;
            Ar.writeString(valueType);
            
            switch (valueType) {
                case "string":
                    Ar.writeString(value);
                    break;
                case "number":
                    if (Number.isInteger(value)) {
                        Ar.writeString("int");
                        Ar.writeInt32(value);
                    } else {
                        Ar.writeString("float");
                        Ar.writeFloat32(value);
                    }
                    break;
                case "boolean":
                    Ar.writeBoolean(value);
                    break;
                default:
                    Ar.writeString(String(value));
                    break;
            }
        }
        
        // Write execution order
        Ar.writeInt32(this.executionOrder.length);
        for (const order of this.executionOrder) {
            Ar.writeInt32(order);
        }
    }

    /**
     * Add a delegate with specific execution order
     */
    addDelegateWithOrder(delegate: FScriptDelegate, order: number = 0): void {
        this.invocationList.push(delegate);
        this.executionOrder.push(order);
    }

    /**
     * Get sorted invocation list by execution order
     */
    getSortedInvocationList(): FScriptDelegate[] {
        const indexed = this.invocationList.map((delegate, index) => ({
            delegate,
            order: this.executionOrder[index] || 0
        }));
        
        indexed.sort((a, b) => a.order - b.order);
        return indexed.map(item => item.delegate);
    }

    /**
     * Get event metadata value
     */
    getEventMetadata(key: string): any {
        return this.eventMetadata.get(key);
    }

    /**
     * Set event metadata
     */
    setEventMetadata(key: string, value: any): void {
        this.eventMetadata.set(key, value);
    }
}

/**
 * FUObjectDelegate - Delegate specifically for UObject function binding
 * Enhanced support for Blueprint and C++ object method binding
 */
export class FUObjectDelegate extends FDynamicDelegate {
    /** Target object type for type safety */
    public targetObjectType: string | null = null;
    
    /** Whether the binding is to a Blueprint function */
    public isBlueprintFunction: boolean = false;
    
    /** Blueprint function category */
    public functionCategory: string | null = null;
    
    /** Function access level (public, protected, private) */
    public accessLevel: string = "public";

    constructor(Ar?: FAssetArchive) {
        super(Ar);
        if (Ar) {
            this.targetObjectType = Ar.readString();
            this.isBlueprintFunction = Ar.readBoolean();
            this.functionCategory = Ar.readString();
            this.accessLevel = Ar.readString();
        }
    }

    /**
     * Serialize UObject delegate data
     */
    serialize(Ar: FAssetArchiveWriter): void {
        super.serialize(Ar);
        Ar.writeString(this.targetObjectType || "");
        Ar.writeBoolean(this.isBlueprintFunction);
        Ar.writeString(this.functionCategory || "");
        Ar.writeString(this.accessLevel);
    }

    /**
     * Check if delegate can bind to a specific object type
     */
    canBindToObjectType(objectType: string): boolean {
        if (!this.targetObjectType) return true;
        
        // Basic type compatibility check
        return this.targetObjectType === objectType || 
               objectType.includes(this.targetObjectType);
    }

    /**
     * Get Blueprint function info
     */
    getBlueprintFunctionInfo(): {
        name: string;
        category: string | null;
        signature: string;
        isEvent: boolean;
    } {
        return {
            name: this.functionName.text || "",
            category: this.functionCategory,
            signature: this.getBlueprintSignature(),
            isEvent: this.signature?.includes("Event") || false
        };
    }
}

/**
 * Enhanced delegate property for Blueprint integration
 * Supports advanced delegate features required by CUE4Parse parity
 */
export class FEnhancedDelegateProperty {
    /** Delegate instance */
    public delegate: FDynamicDelegate | FMulticastDynamicDelegate | FUObjectDelegate;
    
    /** Property metadata */
    public metadata: Map<string, string> = new Map();
    
    /** Blueprint exposure settings */
    public blueprintSettings: {
        callable: boolean;
        pure: boolean;
        latent: boolean;
        cosmetic: boolean;
        meta: Map<string, string>;
    };

    constructor(
        delegate: FDynamicDelegate | FMulticastDynamicDelegate | FUObjectDelegate,
        metadata?: Map<string, string>
    ) {
        this.delegate = delegate;
        this.metadata = metadata || new Map();
        
        this.blueprintSettings = {
            callable: true,
            pure: false,
            latent: false,
            cosmetic: false,
            meta: new Map()
        };
    }

    /**
     * Configure Blueprint exposure
     */
    configureBlueprintExposure(settings: {
        callable?: boolean;
        pure?: boolean;
        latent?: boolean;
        cosmetic?: boolean;
        category?: string;
        tooltip?: string;
    }): void {
        if (settings.callable !== undefined) this.blueprintSettings.callable = settings.callable;
        if (settings.pure !== undefined) this.blueprintSettings.pure = settings.pure;
        if (settings.latent !== undefined) this.blueprintSettings.latent = settings.latent;
        if (settings.cosmetic !== undefined) this.blueprintSettings.cosmetic = settings.cosmetic;
        
        if (settings.category) this.blueprintSettings.meta.set("Category", settings.category);
        if (settings.tooltip) this.blueprintSettings.meta.set("ToolTip", settings.tooltip);
    }

    /**
     * Get metadata value
     */
    getMetadata(key: string): string | undefined {
        return this.metadata.get(key);
    }

    /**
     * Set metadata value
     */
    setMetadata(key: string, value: string): void {
        this.metadata.set(key, value);
    }

    /**
     * Check if delegate is Blueprint accessible
     */
    isBlueprintAccessible(): boolean {
        return this.blueprintSettings.callable;
    }

    /**
     * Get delegate type information
     */
    getDelegateTypeInfo(): {
        type: string;
        isMulticast: boolean;
        isUObject: boolean;
        isDynamic: boolean;
        supportsBlueprints: boolean;
    } {
        return {
            type: this.delegate.constructor.name,
            isMulticast: this.delegate instanceof FMulticastDynamicDelegate,
            isUObject: this.delegate instanceof FUObjectDelegate,
            isDynamic: 'isDynamic' in this.delegate ? this.delegate.isDynamic : false,
            supportsBlueprints: 'supportsBlueprints' in this.delegate ? 
                this.delegate.supportsBlueprints : 
                this.blueprintSettings.callable
        };
    }
}

/**
 * Delegate registry for managing delegate types and signatures
 * Provides validation and type checking for Blueprint integration
 */
export class FDelegateRegistry {
    private static instance: FDelegateRegistry;
    private signatures: Map<string, string> = new Map();
    private types: Map<string, typeof FDynamicDelegate> = new Map();

    private constructor() {
        this.registerDefaultTypes();
    }

    public static getInstance(): FDelegateRegistry {
        if (!FDelegateRegistry.instance) {
            FDelegateRegistry.instance = new FDelegateRegistry();
        }
        return FDelegateRegistry.instance;
    }

    /**
     * Register default delegate types
     */
    private registerDefaultTypes(): void {
        this.types.set("FDynamicDelegate", FDynamicDelegate);
        this.types.set("FMulticastDynamicDelegate", FMulticastDynamicDelegate as any);
        this.types.set("FUObjectDelegate", FUObjectDelegate);
    }

    /**
     * Register a delegate signature
     */
    registerSignature(name: string, signature: string): void {
        this.signatures.set(name, signature);
    }

    /**
     * Get delegate signature
     */
    getSignature(name: string): string | undefined {
        return this.signatures.get(name);
    }

    /**
     * Validate delegate signature
     */
    validateSignature(name: string, parameters: string[]): boolean {
        const signature = this.signatures.get(name);
        if (!signature) return false;
        
        // Basic parameter count validation
        const paramMatches = signature.match(/\w+\s+\w+/g);
        return paramMatches ? paramMatches.length === parameters.length : parameters.length === 0;
    }

    /**
     * Create delegate by type name
     */
    createDelegate(typeName: string, Ar?: FAssetArchive): FDynamicDelegate | null {
        const DelegateClass = this.types.get(typeName);
        if (!DelegateClass) return null;
        
        return new DelegateClass(Ar);
    }

    /**
     * Get all registered delegate types
     */
    getRegisteredTypes(): string[] {
        return Array.from(this.types.keys());
    }

    /**
     * Get all registered signatures
     */
    getRegisteredSignatures(): Map<string, string> {
        return new Map(this.signatures);
    }
}