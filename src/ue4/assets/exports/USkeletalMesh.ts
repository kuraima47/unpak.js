import { UObject } from "./UObject";
import { FAssetArchive } from "../reader/FAssetArchive";
import { FReferenceSkeleton } from "../objects/meshes/FReferenceSkeleton";
import { FSkeletalMeshLODRenderData } from "../objects/meshes/FSkeletalMeshLODRenderData";
import { Lazy } from "../../../util/Lazy";
import { FGuid } from "../../objects/core/misc/Guid";
import { FBoxSphereBounds } from "../../objects/core/math/FBoxSphereBounds";
import { FVector } from "../../objects/core/math/FVector";
import { FStripDataFlags } from "../../objects/engine/FStripDataFlags";
import { UMaterialInterface } from "./mats/UMaterialInterface";

/**
 * Skeletal mesh asset containing rigged geometry, skeleton, and materials
 * Based on CUE4Parse USkeletalMesh implementation
 */
export class USkeletalMesh extends UObject {
    public referenceSkeleton: FReferenceSkeleton = new FReferenceSkeleton();
    public lodRenderData: Array<FSkeletalMeshLODRenderData> = [];
    public materials: Array<Lazy<UMaterialInterface>> = [];
    public bounds: FBoxSphereBounds = new FBoxSphereBounds(new FVector(), new FVector(), 0);
    public stripFlags: FStripDataFlags | null = null;
    
    // Physics and collision
    public physicsAsset: Lazy<UObject> | null = null;
    public shadowPhysicsAsset: Lazy<UObject> | null = null;
    
    // Skeleton and bone properties
    public skeleton: Lazy<UObject> | null = null; // USkeleton
    public lodInfo: Array<any> = [];
    public retargetBasePose: Array<any> = [];
    
    // Rendering and LOD settings
    public lodSettings: Lazy<UObject> | null = null;
    public minLod: number = 0;
    public qualityLevelMinLod: number = 0;
    public negativeOneIndex: number = -1;
    
    // Metadata
    public importedBounds: FBoxSphereBounds = new FBoxSphereBounds(new FVector(), new FVector(), 0);
    public sockets: Array<Lazy<UObject>> = [];
    public morphTargets: Array<Lazy<UObject>> = [];
    
    // Clothing and simulation
    public clothingAssets: Array<Lazy<UObject>> = [];
    
    // Animation and post-process
    public postProcessAnimBlueprint: Lazy<UObject> | null = null;
    public animBlueprintGeneratedClass: Lazy<UObject> | null = null;
    
    // Asset identification
    public skeletalMeshGuid: FGuid | null = null;

    /**
     * Get bone index by name from reference skeleton
     */
    public findBoneIndex(boneName: string): number {
        return this.referenceSkeleton.findBoneIndex(boneName);
    }

    /**
     * Get number of bones in the skeleton
     */
    public getNumBones(): number {
        return this.referenceSkeleton.refBoneInfo.length;
    }

    /**
     * Get number of LODs available
     */
    public getNumLODs(): number {
        return this.lodRenderData.length;
    }

    /**
     * Get LOD render data for specific LOD level
     */
    public getLODRenderData(lodIndex: number): FSkeletalMeshLODRenderData | null {
        if (lodIndex >= 0 && lodIndex < this.lodRenderData.length) {
            return this.lodRenderData[lodIndex];
        }
        return null;
    }

    /**
     * Check if mesh has valid skeleton
     */
    public hasValidSkeleton(): boolean {
        return this.referenceSkeleton && this.referenceSkeleton.refBoneInfo.length > 0;
    }

    /**
     * Get total vertex count across all LODs
     */
    public getTotalVertexCount(): number {
        return this.lodRenderData.reduce((total, lod) => total + lod.numVertices, 0);
    }

    /**
     * Get total triangle count across all LODs
     */
    public getTotalTriangleCount(): number {
        return this.lodRenderData.reduce((total, lod) => {
            return total + lod.sections.reduce((sectionTotal, section) => {
                return sectionTotal + section.numTriangles;
            }, 0);
        }, 0);
    }
}