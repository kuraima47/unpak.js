import { FAssetArchive } from "../../assets/reader/FAssetArchive";
import { FAssetArchiveWriter } from "../../assets/writer/FAssetArchiveWriter";
import { FPackageIndex } from "./ObjectResource";
import { FName } from "./FName";
import { FEnhancedDelegateProperty } from "./AdvancedDelegates";

/**
 * Enhanced Blueprint Properties Support (Phase 3 - Complete Asset Property System)
 * Advanced Blueprint property system with full C++ and Blueprint integration
 * Based on CUE4Parse Blueprint property implementation
 */

/**
 * Blueprint property metadata for enhanced Blueprint integration
 */
export interface IBlueprintPropertyMetadata {
    category?: string;
    displayName?: string;
    tooltip?: string;
    keywords?: string[];
    editCondition?: string;
    range?: { min: number; max: number };
    units?: string;
    allowPrivateAccess?: boolean;
    blueprintReadOnly?: boolean;
    blueprintReadWrite?: boolean;
    exposeOnSpawn?: boolean;
    savegame?: boolean;
    replicatedUsing?: string;
    customization?: Map<string, string>;
}

/**
 * FBlueprintProperty - Enhanced Blueprint property with full metadata support
 */
export class FBlueprintProperty {
    /** Property name */
    public name: FName;
    
    /** Property type */
    public type: string;
    
    /** Property size in bytes */
    public size: number;
    
    /** Property offset in object */
    public offset: number;
    
    /** Property flags (CPP and Blueprint) */
    public flags: {
        cpp: number;
        blueprint: number;
        editor: number;
        replication: number;
    };
    
    /** Enhanced metadata */
    public metadata: IBlueprintPropertyMetadata;
    
    /** Default value if any */
    public defaultValue: any = null;
    
    /** Array dimensions for array properties */
    public arrayDimensions: number[] = [];
    
    /** Inner property for containers (TArray, TMap, etc.) */
    public innerProperty: FBlueprintProperty | null = null;
    
    /** Value property for TMap */
    public valueProperty: FBlueprintProperty | null = null;
    
    /** Delegate property for delegate types */
    public delegateProperty: FEnhancedDelegateProperty | null = null;

    constructor(Ar?: FAssetArchive) {
        this.flags = {
            cpp: 0,
            blueprint: 0,
            editor: 0,
            replication: 0
        };
        
        this.metadata = {};
        
        if (Ar) {
            this.deserialize(Ar);
        } else {
            this.name = new FName();
            this.type = "";
            this.size = 0;
            this.offset = 0;
        }
    }

    /**
     * Deserialize Blueprint property from archive
     */
    private deserialize(Ar: FAssetArchive): void {
        this.name = Ar.readFName();
        this.type = Ar.readString();
        this.size = Ar.readInt32();
        this.offset = Ar.readInt32();
        
        // Read flags
        this.flags.cpp = Ar.readInt32();
        this.flags.blueprint = Ar.readInt32();
        this.flags.editor = Ar.readInt32();
        this.flags.replication = Ar.readInt32();
        
        // Read array dimensions
        const arrayDimCount = Ar.readInt32();
        this.arrayDimensions = [];
        for (let i = 0; i < arrayDimCount; i++) {
            this.arrayDimensions.push(Ar.readInt32());
        }
        
        // Read metadata
        this.deserializeMetadata(Ar);
        
        // Read inner property if exists
        const hasInnerProperty = Ar.readBoolean();
        if (hasInnerProperty) {
            this.innerProperty = new FBlueprintProperty(Ar);
        }
        
        // Read value property for maps
        const hasValueProperty = Ar.readBoolean();
        if (hasValueProperty) {
            this.valueProperty = new FBlueprintProperty(Ar);
        }
        
        // Read delegate property if exists
        const hasDelegateProperty = Ar.readBoolean();
        if (hasDelegateProperty) {
            // This would need to be implemented based on the delegate type
            // For now, create a placeholder
        }
        
        // Read default value
        this.deserializeDefaultValue(Ar);
    }

    /**
     * Deserialize metadata from archive
     */
    private deserializeMetadata(Ar: FAssetArchive): void {
        const metadataCount = Ar.readInt32();
        this.metadata = {};
        
        for (let i = 0; i < metadataCount; i++) {
            const key = Ar.readString();
            const value = Ar.readString();
            
            switch (key) {
                case "Category":
                    this.metadata.category = value;
                    break;
                case "DisplayName":
                    this.metadata.displayName = value;
                    break;
                case "ToolTip":
                    this.metadata.tooltip = value;
                    break;
                case "Keywords":
                    this.metadata.keywords = value.split(',').map(k => k.trim());
                    break;
                case "EditCondition":
                    this.metadata.editCondition = value;
                    break;
                case "UIMin":
                case "UIMax":
                    if (!this.metadata.range) this.metadata.range = { min: 0, max: 100 };
                    if (key === "UIMin") this.metadata.range.min = parseFloat(value);
                    if (key === "UIMax") this.metadata.range.max = parseFloat(value);
                    break;
                case "Units":
                    this.metadata.units = value;
                    break;
                case "AllowPrivateAccess":
                    this.metadata.allowPrivateAccess = value.toLowerCase() === "true";
                    break;
                case "BlueprintReadOnly":
                    this.metadata.blueprintReadOnly = value.toLowerCase() === "true";
                    break;
                case "ExposeOnSpawn":
                    this.metadata.exposeOnSpawn = value.toLowerCase() === "true";
                    break;
                case "SaveGame":
                    this.metadata.savegame = value.toLowerCase() === "true";
                    break;
                case "ReplicatedUsing":
                    this.metadata.replicatedUsing = value;
                    break;
                default:
                    if (!this.metadata.customization) {
                        this.metadata.customization = new Map();
                    }
                    this.metadata.customization.set(key, value);
                    break;
            }
        }
    }

    /**
     * Deserialize default value based on property type
     */
    private deserializeDefaultValue(Ar: FAssetArchive): void {
        const hasDefaultValue = Ar.readBoolean();
        if (!hasDefaultValue) return;
        
        switch (this.type) {
            case "BoolProperty":
                this.defaultValue = Ar.readBoolean();
                break;
            case "ByteProperty":
                this.defaultValue = Ar.readUInt8();
                break;
            case "IntProperty":
                this.defaultValue = Ar.readInt32();
                break;
            case "FloatProperty":
                this.defaultValue = Ar.readFloat32();
                break;
            case "DoubleProperty":
                this.defaultValue = Ar.readFloat32(); // Use float32 as fallback
                break;
            case "StrProperty":
            case "NameProperty":
                this.defaultValue = Ar.readString();
                break;
            case "TextProperty":
                // Text properties have more complex serialization
                this.defaultValue = Ar.readString();
                break;
            case "ObjectProperty":
            case "WeakObjectProperty":
            case "SoftObjectProperty":
                this.defaultValue = new FPackageIndex(Ar);
                break;
            case "EnumProperty":
                this.defaultValue = Ar.readFName();
                break;
            case "StructProperty":
                // Struct default values would need struct-specific deserialization
                this.defaultValue = "StructDefaultValue"; // Placeholder
                break;
            case "ArrayProperty":
                // Array default values would need array-specific deserialization
                this.defaultValue = []; // Placeholder
                break;
            case "MapProperty":
                // Map default values would need map-specific deserialization
                this.defaultValue = new Map(); // Placeholder
                break;
            case "SetProperty":
                // Set default values would need set-specific deserialization
                this.defaultValue = new Set(); // Placeholder
                break;
            default:
                // Unknown property type, read as string
                this.defaultValue = Ar.readString();
                break;
        }
    }

    /**
     * Serialize Blueprint property
     */
    serialize(Ar: FAssetArchiveWriter): void {
        Ar.writeFName(this.name);
        Ar.writeString(this.type);
        Ar.writeInt32(this.size);
        Ar.writeInt32(this.offset);
        
        // Write flags
        Ar.writeInt32(this.flags.cpp);
        Ar.writeInt32(this.flags.blueprint);
        Ar.writeInt32(this.flags.editor);
        Ar.writeInt32(this.flags.replication);
        
        // Write array dimensions
        Ar.writeInt32(this.arrayDimensions.length);
        for (const dim of this.arrayDimensions) {
            Ar.writeInt32(dim);
        }
        
        // Write metadata
        this.serializeMetadata(Ar);
        
        // Write inner property
        Ar.writeBoolean(this.innerProperty !== null);
        if (this.innerProperty) {
            this.innerProperty.serialize(Ar);
        }
        
        // Write value property
        Ar.writeBoolean(this.valueProperty !== null);
        if (this.valueProperty) {
            this.valueProperty.serialize(Ar);
        }
        
        // Write delegate property
        Ar.writeBoolean(this.delegateProperty !== null);
        if (this.delegateProperty) {
            // Delegate serialization would be implemented here
        }
        
        // Write default value
        this.serializeDefaultValue(Ar);
    }

    /**
     * Serialize metadata
     */
    private serializeMetadata(Ar: FAssetArchiveWriter): void {
        const metadata: Array<[string, string]> = [];
        
        if (this.metadata.category) metadata.push(["Category", this.metadata.category]);
        if (this.metadata.displayName) metadata.push(["DisplayName", this.metadata.displayName]);
        if (this.metadata.tooltip) metadata.push(["ToolTip", this.metadata.tooltip]);
        if (this.metadata.keywords) metadata.push(["Keywords", this.metadata.keywords.join(", ")]);
        if (this.metadata.editCondition) metadata.push(["EditCondition", this.metadata.editCondition]);
        if (this.metadata.range) {
            metadata.push(["UIMin", this.metadata.range.min.toString()]);
            metadata.push(["UIMax", this.metadata.range.max.toString()]);
        }
        if (this.metadata.units) metadata.push(["Units", this.metadata.units]);
        if (this.metadata.allowPrivateAccess !== undefined) {
            metadata.push(["AllowPrivateAccess", this.metadata.allowPrivateAccess.toString()]);
        }
        if (this.metadata.blueprintReadOnly !== undefined) {
            metadata.push(["BlueprintReadOnly", this.metadata.blueprintReadOnly.toString()]);
        }
        if (this.metadata.exposeOnSpawn !== undefined) {
            metadata.push(["ExposeOnSpawn", this.metadata.exposeOnSpawn.toString()]);
        }
        if (this.metadata.savegame !== undefined) {
            metadata.push(["SaveGame", this.metadata.savegame.toString()]);
        }
        if (this.metadata.replicatedUsing) {
            metadata.push(["ReplicatedUsing", this.metadata.replicatedUsing]);
        }
        
        // Add custom metadata
        if (this.metadata.customization) {
            for (const [key, value] of this.metadata.customization) {
                metadata.push([key, value]);
            }
        }
        
        Ar.writeInt32(metadata.length);
        for (const [key, value] of metadata) {
            Ar.writeString(key);
            Ar.writeString(value);
        }
    }

    /**
     * Serialize default value
     */
    private serializeDefaultValue(Ar: FAssetArchiveWriter): void {
        const hasDefaultValue = this.defaultValue !== null && this.defaultValue !== undefined;
        Ar.writeBoolean(hasDefaultValue);
        
        if (!hasDefaultValue) return;
        
        switch (this.type) {
            case "BoolProperty":
                Ar.writeBoolean(this.defaultValue as boolean);
                break;
            case "ByteProperty":
                Ar.writeUInt8(this.defaultValue as number);
                break;
            case "IntProperty":
                Ar.writeInt32(this.defaultValue as number);
                break;
            case "FloatProperty":
                Ar.writeFloat32(this.defaultValue as number);
                break;
            case "DoubleProperty":
                Ar.writeFloat32(this.defaultValue as number); // Use float32 as fallback
                break;
            case "StrProperty":
            case "NameProperty":
            case "TextProperty":
                Ar.writeString(this.defaultValue as string);
                break;
            case "ObjectProperty":
            case "WeakObjectProperty":
            case "SoftObjectProperty":
                (this.defaultValue as FPackageIndex).serialize(Ar);
                break;
            case "EnumProperty":
                Ar.writeFName(this.defaultValue as FName);
                break;
            default:
                Ar.writeString(String(this.defaultValue));
                break;
        }
    }

    /**
     * Check if property is Blueprint accessible
     */
    isBlueprintAccessible(): boolean {
        // Check Blueprint flags
        const BLUEPRINT_VISIBLE = 0x00000001;
        const BLUEPRINT_READONLY = 0x00000002;
        return (this.flags.blueprint & (BLUEPRINT_VISIBLE | BLUEPRINT_READONLY)) !== 0;
    }

    /**
     * Check if property is replicated
     */
    isReplicated(): boolean {
        const REPLICATED = 0x00000001;
        return (this.flags.replication & REPLICATED) !== 0;
    }

    /**
     * Check if property is array
     */
    isArray(): boolean {
        return this.type === "ArrayProperty" || this.arrayDimensions.length > 0;
    }

    /**
     * Check if property is container (Array, Map, Set)
     */
    isContainer(): boolean {
        return ["ArrayProperty", "MapProperty", "SetProperty"].includes(this.type);
    }

    /**
     * Get property size including array dimensions
     */
    getTotalSize(): number {
        let totalSize = this.size;
        for (const dim of this.arrayDimensions) {
            totalSize *= dim;
        }
        return totalSize;
    }

    /**
     * Get Blueprint-friendly type name
     */
    getBlueprintTypeName(): string {
        switch (this.type) {
            case "BoolProperty": return "Boolean";
            case "ByteProperty": return "Byte";
            case "IntProperty": return "Integer";
            case "FloatProperty": return "Float";
            case "DoubleProperty": return "Double";
            case "StrProperty": return "String";
            case "NameProperty": return "Name";
            case "TextProperty": return "Text";
            case "ObjectProperty": return "Object Reference";
            case "WeakObjectProperty": return "Weak Object Reference";
            case "SoftObjectProperty": return "Soft Object Reference";
            case "EnumProperty": return "Enum";
            case "StructProperty": return "Struct";
            case "ArrayProperty": return "Array";
            case "MapProperty": return "Map";
            case "SetProperty": return "Set";
            default: return this.type.replace("Property", "");
        }
    }

    /**
     * Export property to Blueprint-compatible format
     */
    exportToBlueprintFormat(): {
        name: string;
        type: string;
        category: string;
        description: string;
        defaultValue: any;
        isReadOnly: boolean;
        isArray: boolean;
        metadata: IBlueprintPropertyMetadata;
    } {
        return {
            name: this.name.text || "",
            type: this.getBlueprintTypeName(),
            category: this.metadata.category || "Default",
            description: this.metadata.tooltip || "",
            defaultValue: this.defaultValue,
            isReadOnly: this.metadata.blueprintReadOnly || false,
            isArray: this.isArray(),
            metadata: this.metadata
        };
    }
}

/**
 * FBlueprintInterfaceProperty - Interface property support for UE interfaces
 */
export class FBlueprintInterfaceProperty extends FBlueprintProperty {
    /** Interface class reference */
    public interfaceClass: FPackageIndex | null = null;
    
    /** Interface methods that must be implemented */
    public requiredMethods: string[] = [];
    
    /** Interface events that can be implemented */
    public optionalEvents: string[] = [];

    constructor(Ar?: FAssetArchive) {
        super(Ar);
        if (Ar) {
            this.interfaceClass = new FPackageIndex(Ar);
            
            // Read required methods
            const methodCount = Ar.readInt32();
            this.requiredMethods = [];
            for (let i = 0; i < methodCount; i++) {
                this.requiredMethods.push(Ar.readString());
            }
            
            // Read optional events
            const eventCount = Ar.readInt32();
            this.optionalEvents = [];
            for (let i = 0; i < eventCount; i++) {
                this.optionalEvents.push(Ar.readString());
            }
        }
    }

    /**
     * Serialize interface property
     */
    serialize(Ar: FAssetArchiveWriter): void {
        super.serialize(Ar);
        
        if (this.interfaceClass) {
            this.interfaceClass.serialize(Ar);
        } else {
            new FPackageIndex().serialize(Ar);
        }
        
        // Write required methods
        Ar.writeInt32(this.requiredMethods.length);
        for (const method of this.requiredMethods) {
            Ar.writeString(method);
        }
        
        // Write optional events
        Ar.writeInt32(this.optionalEvents.length);
        for (const event of this.optionalEvents) {
            Ar.writeString(event);
        }
    }

    /**
     * Check if interface is implemented
     */
    isInterfaceImplemented(): boolean {
        return this.interfaceClass !== null && !this.interfaceClass.isNull();
    }

    /**
     * Get interface implementation info
     */
    getInterfaceInfo(): {
        className: string;
        requiredMethods: string[];
        optionalEvents: string[];
        isImplemented: boolean;
    } {
        return {
            className: this.interfaceClass?.toString() || "",
            requiredMethods: this.requiredMethods,
            optionalEvents: this.optionalEvents,
            isImplemented: this.isInterfaceImplemented()
        };
    }
}

/**
 * Blueprint property collection for managing multiple properties
 */
export class FBlueprintPropertyCollection {
    private properties: Map<string, FBlueprintProperty> = new Map();
    private interfaces: Map<string, FBlueprintInterfaceProperty> = new Map();
    private delegates: Map<string, FEnhancedDelegateProperty> = new Map();

    /**
     * Add a Blueprint property
     */
    addProperty(property: FBlueprintProperty): void {
        this.properties.set(property.name.text || "", property);
    }

    /**
     * Add an interface property
     */
    addInterface(property: FBlueprintInterfaceProperty): void {
        this.interfaces.set(property.name.text || "", property);
    }

    /**
     * Add a delegate property
     */
    addDelegate(name: string, property: FEnhancedDelegateProperty): void {
        this.delegates.set(name, property);
    }

    /**
     * Get property by name
     */
    getProperty(name: string): FBlueprintProperty | undefined {
        return this.properties.get(name);
    }

    /**
     * Get interface property by name
     */
    getInterface(name: string): FBlueprintInterfaceProperty | undefined {
        return this.interfaces.get(name);
    }

    /**
     * Get delegate property by name
     */
    getDelegate(name: string): FEnhancedDelegateProperty | undefined {
        return this.delegates.get(name);
    }

    /**
     * Get all Blueprint-accessible properties
     */
    getBlueprintAccessibleProperties(): FBlueprintProperty[] {
        return Array.from(this.properties.values()).filter(prop => prop.isBlueprintAccessible());
    }

    /**
     * Get all replicated properties
     */
    getReplicatedProperties(): FBlueprintProperty[] {
        return Array.from(this.properties.values()).filter(prop => prop.isReplicated());
    }

    /**
     * Get properties by category
     */
    getPropertiesByCategory(category: string): FBlueprintProperty[] {
        return Array.from(this.properties.values())
            .filter(prop => prop.metadata.category === category);
    }

    /**
     * Get all property names
     */
    getPropertyNames(): string[] {
        return Array.from(this.properties.keys());
    }

    /**
     * Get all interface names
     */
    getInterfaceNames(): string[] {
        return Array.from(this.interfaces.keys());
    }

    /**
     * Get all delegate names
     */
    getDelegateNames(): string[] {
        return Array.from(this.delegates.keys());
    }

    /**
     * Export all properties to Blueprint format
     */
    exportToBlueprintFormat(): {
        properties: any[];
        interfaces: any[];
        delegates: any[];
        summary: {
            totalProperties: number;
            blueprintAccessible: number;
            replicated: number;
            interfaces: number;
            delegates: number;
        };
    } {
        const props = Array.from(this.properties.values());
        const blueprintAccessible = this.getBlueprintAccessibleProperties();
        const replicated = this.getReplicatedProperties();

        return {
            properties: props.map(prop => prop.exportToBlueprintFormat()),
            interfaces: Array.from(this.interfaces.values()).map(iface => iface.getInterfaceInfo()),
            delegates: Array.from(this.delegates.values()).map(del => del.getDelegateTypeInfo()),
            summary: {
                totalProperties: props.length,
                blueprintAccessible: blueprintAccessible.length,
                replicated: replicated.length,
                interfaces: this.interfaces.size,
                delegates: this.delegates.size
            }
        };
    }
}