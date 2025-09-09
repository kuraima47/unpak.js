import { FArchive } from "../../reader/FArchive";
import { FAssetRegistryTag } from "../../registry/objects/FAssetRegistryTag";
import { UBlueprint } from "./UBlueprint";

/**
 * Animation Blueprint Asset
 * Represents UE4/UE5 Animation Blueprint classes that control skeletal mesh animations
 * Based on CUE4Parse UAnimBlueprint implementation
 */
export class UAnimBlueprint extends UBlueprint {
    /** Target skeletal mesh for this animation blueprint */
    public targetSkeleton?: string;
    
    /** Animation mode (AnimGraph, StateMachine, etc.) */
    public animationMode: string = "AnimGraph";
    
    /** List of animation assets referenced by this blueprint */
    public referencedAnimAssets: string[] = [];
    
    /** Animation variables and their default values */
    public animVariables: Map<string, any> = new Map();

    constructor(Ar: FArchive, exportType?: string) {
        super(Ar, exportType);
        this.deserializeAnimBlueprintData(Ar);
    }

    /**
     * Deserialize animation blueprint specific data
     */
    private deserializeAnimBlueprintData(Ar: FArchive): void {
        try {
            // Read target skeleton reference
            const skeletonPath = Ar.readString();
            if (skeletonPath && skeletonPath.length > 0) {
                this.targetSkeleton = skeletonPath;
            }

            // Read animation mode
            const animMode = Ar.readString();
            if (animMode && animMode.length > 0) {
                this.animationMode = animMode;
            }

            // Read referenced animation assets
            const numAnimAssets = Ar.readInt32();
            for (let i = 0; i < numAnimAssets; i++) {
                const animAssetPath = Ar.readString();
                if (animAssetPath) {
                    this.referencedAnimAssets.push(animAssetPath);
                }
            }

            // Read animation variables
            const numAnimVars = Ar.readInt32();
            for (let i = 0; i < numAnimVars; i++) {
                const varName = Ar.readString();
                const varType = Ar.readString();
                let varValue: any = null;

                // Read variable value based on type
                switch (varType) {
                    case "bool":
                        varValue = Ar.readBoolean();
                        break;
                    case "float":
                        varValue = Ar.readFloat32();
                        break;
                    case "int":
                        varValue = Ar.readInt32();
                        break;
                    case "string":
                        varValue = Ar.readString();
                        break;
                    default:
                        // For complex types, just store as string reference
                        varValue = Ar.readString();
                        break;
                }

                if (varName) {
                    this.animVariables.set(varName, varValue);
                }
            }
        } catch (error) {
            // If parsing fails, continue with base blueprint functionality
            console.warn(`Failed to parse animation blueprint data: ${error}`);
        }
    }

    /**
     * Get the target skeleton mesh for this animation blueprint
     */
    public getTargetSkeleton(): string | undefined {
        return this.targetSkeleton;
    }

    /**
     * Get all animation assets referenced by this blueprint
     */
    public getReferencedAnimAssets(): string[] {
        return [...this.referencedAnimAssets];
    }

    /**
     * Get animation variables
     */
    public getAnimVariables(): Map<string, any> {
        return new Map(this.animVariables);
    }

    /**
     * Check if this animation blueprint targets a specific skeleton
     */
    public isCompatibleWithSkeleton(skeletonPath: string): boolean {
        return this.targetSkeleton === skeletonPath;
    }

    /**
     * Get asset registry tags specific to animation blueprints
     */
    public getAnimBlueprintAssetRegistryTags(): FAssetRegistryTag[] {
        const tags = this.getAssetRegistryTags();
        
        if (this.targetSkeleton) {
            tags.push({
                key: "TargetSkeleton",
                value: this.targetSkeleton
            } as FAssetRegistryTag);
        }

        if (this.animationMode) {
            tags.push({
                key: "AnimationMode", 
                value: this.animationMode
            } as FAssetRegistryTag);
        }

        tags.push({
            key: "ReferencedAnimAssetCount",
            value: this.referencedAnimAssets.length.toString()
        } as FAssetRegistryTag);

        return tags;
    }

    public toString(): string {
        return `UAnimBlueprint(skeleton=${this.targetSkeleton}, mode=${this.animationMode}, animAssets=${this.referencedAnimAssets.length})`;
    }
}