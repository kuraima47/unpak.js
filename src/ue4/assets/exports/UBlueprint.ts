import { FArchive } from "../../reader/FArchive";
import { FAssetRegistryTag } from "../../registry/objects/FAssetRegistryTag";

/**
 * Base Blueprint Asset
 * Represents UE4/UE5 Blueprint classes - visual scripting assets
 * Based on CUE4Parse UBlueprint implementation  
 */
export class UBlueprint {
    /** Blueprint type (Actor, Component, Interface, etc.) */
    public blueprintType: string = "Actor";
    
    /** Parent class this blueprint inherits from */
    public parentClass?: string;
    
    /** Blueprint description/tooltip */
    public blueprintDescription: string = "";
    
    /** Whether this blueprint is compilable */
    public isCompilable: boolean = true;
    
    /** Blueprint category for organization */
    public blueprintCategory: string = "";
    
    /** Blueprint variables and their types */
    public blueprintVariables: Map<string, string> = new Map();
    
    /** Blueprint functions */
    public blueprintFunctions: string[] = [];

    constructor(Ar: FArchive, exportType?: string) {
        this.deserializeBlueprintData(Ar);
    }

    /**
     * Deserialize blueprint specific data
     */
    protected deserializeBlueprintData(Ar: FArchive): void {
        try {
            // Read blueprint type
            const bpType = Ar.readString();
            if (bpType && bpType.length > 0) {
                this.blueprintType = bpType;
            }

            // Read parent class
            const parentPath = Ar.readString();
            if (parentPath && parentPath.length > 0) {
                this.parentClass = parentPath;
            }

            // Read blueprint description
            const description = Ar.readString();
            if (description) {
                this.blueprintDescription = description;
            }

            // Read compilation status
            this.isCompilable = Ar.readBoolean();

            // Read category
            const category = Ar.readString();
            if (category) {
                this.blueprintCategory = category;
            }

            // Read blueprint variables
            const numVars = Ar.readInt32();
            for (let i = 0; i < numVars; i++) {
                const varName = Ar.readString();
                const varType = Ar.readString();
                if (varName && varType) {
                    this.blueprintVariables.set(varName, varType);
                }
            }

            // Read blueprint functions
            const numFunctions = Ar.readInt32();
            for (let i = 0; i < numFunctions; i++) {
                const funcName = Ar.readString();
                if (funcName) {
                    this.blueprintFunctions.push(funcName);
                }
            }
        } catch (error) {
            // If parsing fails, continue with base object functionality
            console.warn(`Failed to parse blueprint data: ${error}`);
        }
    }

    /**
     * Get blueprint type
     */
    public getBlueprintType(): string {
        return this.blueprintType;
    }

    /**
     * Get parent class name
     */
    public getParentClass(): string | undefined {
        return this.parentClass;
    }

    /**
     * Get blueprint variables
     */
    public getBlueprintVariables(): Map<string, string> {
        return new Map(this.blueprintVariables);
    }

    /**
     * Get blueprint functions
     */
    public getBlueprintFunctions(): string[] {
        return [...this.blueprintFunctions];
    }

    /**
     * Check if blueprint can be compiled
     */
    public canCompile(): boolean {
        return this.isCompilable;
    }

    /**
     * Get asset registry tags for blueprints
     */
    public getAssetRegistryTags(): FAssetRegistryTag[] {
        const tags: FAssetRegistryTag[] = [];
        
        tags.push({
            key: "BlueprintType",
            value: this.blueprintType
        } as FAssetRegistryTag);

        if (this.parentClass) {
            tags.push({
                key: "ParentClass",
                value: this.parentClass
            } as FAssetRegistryTag);
        }

        if (this.blueprintCategory) {
            tags.push({
                key: "Category", 
                value: this.blueprintCategory
            } as FAssetRegistryTag);
        }

        tags.push({
            key: "IsCompilable",
            value: this.isCompilable.toString()
        } as FAssetRegistryTag);

        tags.push({
            key: "VariableCount",
            value: this.blueprintVariables.size.toString()
        } as FAssetRegistryTag);

        tags.push({
            key: "FunctionCount",
            value: this.blueprintFunctions.length.toString()
        } as FAssetRegistryTag);

        return tags;
    }

    public toString(): string {
        return `UBlueprint(type=${this.blueprintType}, parent=${this.parentClass}, vars=${this.blueprintVariables.size})`;
    }
}