import { UMeshComponent } from "./UMeshComponent";
import { USkeletalMesh } from "../USkeletalMesh";
import { Lazy } from "../../../../util/Lazy";
import { FAssetArchive } from "../../reader/FAssetArchive";
import { UnrealArray } from "../../../../util/UnrealArray";
import { FVector } from "../../../objects/core/math/FVector";

/**
 * Skeletal mesh component for rendering skeletal meshes with animation
 * Based on CUE4Parse USkeletalMeshComponent implementation
 */
export class USkeletalMeshComponent extends UMeshComponent {
    public skeletalMesh: Lazy<USkeletalMesh> | null = null;
    public animationMode: number = 0; // EAnimationMode
    public animationBlueprint: Lazy<any> | null = null;
    public animClass: Lazy<any> | null = null;
    public animSequence: Lazy<any> | null = null;
    public forcedLodModel: number = 0;
    public minLodModel: number = 0;
    public syncGroup: string = "";
    public bCastDynamicShadow: boolean = true;
    public bCastStaticShadow: boolean = true;
    public bCastVolumetricTranslucentShadow: boolean = false;
    public bCastInsetShadow: boolean = false;
    public bSelfShadowOnly: boolean = false;
    public bCastFarShadow: boolean = false;
    public bCastHiddenShadow: boolean = false;
    public bCastShadowAsTwoSided: boolean = false;
    public bLightAsIfStatic: boolean = false;
    public bLightAttachmentsAsGroup: boolean = true;
    public bExcludeFromLightAttachmentGroup: boolean = false;
    public bReceivesDecals: boolean = true;
    public bUseAsOccluder: boolean = false;
    public bSelectable: boolean = true;
    public bHasPerInstanceHitProxies: boolean = false;
    public bUseEditorCompositing: boolean = false;
    public bRenderCustomDepth: boolean = false;
    public customDepthStencilValue: number = 0;
    public customDepthStencilWriteMask: number = 255;
    public translucencySortPriority: number = 0;
    public boundsScale: number = 1.0;
    public bUseAttachParentBound: boolean = false;
    public bUseBoundsFromMasterPoseComponent: boolean = false;
    public bConsiderAllBodiesForBounds: boolean = false;
    public bForceRefPose: boolean = false;
    public bDisableRigidBodyAnimNode: boolean = false;
    public bDisableMorphTarget: boolean = false;
    public bHideSkin: boolean = false;
    public bPerBoneMotionBlur: boolean = true;
    public bComponentUseFixedSkelBounds: boolean = false;
    public bChartDistanceFactor: boolean = false;
    public bRecentlyRendered: boolean = false;
    public bOccluderWasVisible: boolean = false;
    public bOccluderIsBeingRendered: boolean = false;
    public bForceWireframe: boolean = false;
    public bDisplayBones: boolean = false;
    public bDisableClothSimulation: boolean = false;
    public bCollideComplexAsSimple: boolean = false;
    public bBlendPhysics: boolean = false;
    public bEnablePhysicsOnDedicatedServer: boolean = true;
    public bUpdateJointsFromAnimation: boolean = false;
    public bDisableRigidbodyAnimNode: boolean = false;
    public bUpdateAnimationInEditor: boolean = true;
    public bUpdateClothInEditor: boolean = true;
    public bUpdateSimulatingClothInEditor: boolean = true;
    public bClampAnimRootMotionVelocity: boolean = false;
    public globalAnimRateScale: number = 1.0;
    public kinamaticBonesUpdateType: number = 0; // EKinematicBonesUpdateToPhysics
    public physicsBoneUpdateRule: number = 0; // EPhysicsTransformUpdateMode
    public bNotifyRigidBodyCollision: boolean = false;
    public bPauseAnims: boolean = false;
    public bNoSkeletonUpdate: boolean = false;
    public bEnableLineCheckWithBounds: boolean = false;
    public bRequiredBonesUpToDate: boolean = true;
    public bAnimTreeRunning: boolean = false;
    public bAutonomousTickPose: boolean = true;
    public bOnlyAllowAutonomousTickPose: boolean = false;
    public bIsAutonomousTickPose: boolean = false;
    public bOldForceRefPose: boolean = false;
    public bShowPrePhysBones: boolean = false;
    public bRequireBoneWeightNormalization: boolean = true;
    public lineCheckBoundsScale: FVector = new FVector(1, 1, 1);

    /**
     * Get the skeletal mesh asset
     */
    public getSkeletalMesh(): USkeletalMesh | null {
        return this.skeletalMesh?.value || null;
    }

    /**
     * Check if component has a valid skeletal mesh
     */
    public hasValidSkeletalMesh(): boolean {
        const mesh = this.getSkeletalMesh();
        return mesh && mesh.hasValidSkeleton();
    }

    /**
     * Get forced LOD level (-1 for automatic)
     */
    public getForcedLOD(): number {
        return this.forcedLodModel - 1; // Convert from 1-based to 0-based
    }

    /**
     * Check if animation is paused
     */
    public isAnimationPaused(): boolean {
        return this.bPauseAnims;
    }

    /**
     * Check if component updates in editor
     */
    public shouldUpdateInEditor(): boolean {
        return this.bUpdateAnimationInEditor;
    }
}