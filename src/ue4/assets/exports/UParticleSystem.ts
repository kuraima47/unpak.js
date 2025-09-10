import { UObject } from "./UObject";
import { FAssetArchive } from "../reader/FAssetArchive";
import { Lazy } from "../../../util/Lazy";
import { FVector } from "../../objects/core/math/FVector";
import { FColor } from "../../objects/core/math/FColor";

/**
 * Particle emitter data structure
 * Based on CUE4Parse FParticleEmitterInstance
 */
export class FParticleEmitterData {
    public emitterName: string = "";
    public emitterType: number = 0; // EParticleEmitterType
    public maxActiveParticles: number = 100;
    public spawnRate: number = 10.0;
    public burstList: Array<any> = [];
    public emitterDuration: number = 0.0;
    public emitterDelay: number = 0.0;
    public bEmitterDelayUseRange: boolean = false;
    public emitterDelayLow: number = 0.0;
    public emitterLoops: number = 0;
    public bKillOnDeactivate: boolean = false;
    public bKillOnCompleted: boolean = false;
    public bDisableWhenInsignificant: boolean = false;
    public bUseLegacySpawningBehavior: boolean = false;
    public bEnabled: boolean = true;
    
    // LOD settings
    public mediumDetailSpawnRateScale: number = 1.0;
    public lowDetailSpawnRateScale: number = 1.0;
    public qualityLevelSpawnRateScale: Array<number> = [1.0, 1.0, 1.0, 1.0];
}

/**
 * Particle module data for various effects
 * Based on CUE4Parse UParticleModule system
 */
export class FParticleModuleData {
    public moduleType: string = "";
    public bEnabled: boolean = true;
    public bSupported3DDrawMode: boolean = true;
    public bUpdateModule: boolean = true;
    public bFinalUpdateModule: boolean = false;
    public bUpdateForGPUEmitter: boolean = false;
    public bSupportsRandomSeed: boolean = false;
    public bRequiresLoopingNotification: boolean = false;
    public randomSeed: number = 0;
    
    // Common module properties
    public startTime: number = 0.0;
    public endTime: number = 1.0;
    public spawnTimeOnly: boolean = false;
}

/**
 * Material override for particle rendering
 * Based on CUE4Parse FParticleMaterialOverride
 */
export class FParticleMaterialOverride {
    public material: Lazy<any> | null = null; // UMaterialInterface
    public bOverride_OpacitySourceMode: boolean = false;
    public opacitySourceMode: number = 0; // EOpacitySourceMode
    public bOverride_TwoSided: boolean = false;
    public bTwoSided: boolean = false;
    public bOverride_DitheredLODTransition: boolean = false;
    public bDitheredLODTransition: boolean = false;
}

/**
 * Cascade particle system asset
 * Based on CUE4Parse UParticleSystem implementation
 */
export class UParticleSystem extends UObject {
    // Core particle system data
    public emitters: Array<Lazy<any>> = []; // UParticleEmitter objects
    public systemUpdateMode: number = 0; // EParticleSystemUpdateMode
    public updateTime_FPS: number = 60.0;
    public updateTime_Delta: number = 1.0 / 60.0;
    public warmupTime: number = 0.0;
    public warmupTickRate: number = 60.0;
    
    // System behavior settings
    public bUseFixedRelativeBoundingBox: boolean = false;
    public bShouldResetPeakCounts: boolean = false;
    public bHasPhysics: boolean = false;
    public bUseRealtimeThumbnail: boolean = false;
    public bIsElligibleForAsyncTick: boolean = true;
    public bCanBeOccluded: boolean = true;
    public bAllowManagedTicking: boolean = true;
    public bAutoDeactivate: boolean = true;
    public bRegenerateLODDuplicates: boolean = false;
    
    // Performance and LOD settings
    public occlusionBoundsMethod: number = 0; // EParticleSystemOcclusionBoundsMethod
    public maxSignificanceLevel: number = 0; // EParticleSignificanceLevel
    public insignificanceDelay: number = 5.0;
    public insignificantReaction: number = 0; // EParticleSystemInsignificantReaction
    
    // Bounding and culling
    public fixedRelativeBoundingBox: any | null = null; // FBox
    public secondsBeforeInactive: number = 1.0;
    public macroUVPosition: FVector = new FVector();
    public macroUVRadius: number = 200.0;
    
    // Material and rendering
    public materialParameterCollections: Array<Lazy<any>> = [];
    public namedMaterialSlots: Array<FParticleMaterialOverride> = [];
    
    // System organization
    public systemComponent: Lazy<any> | null = null; // UParticleSystemComponent
    public thumbnailInfo: Lazy<any> | null = null;
    
    // LOD settings
    public lodDistances: Array<number> = [];
    public lodSettings: Array<any> = [];
    public lodMethod: number = 0; // EParticleSystemLODMethod
    
    // Collision and physics
    public collisionSettings: any | null = null;
    public floorMesh: string = "";
    public floorPosition: FVector = new FVector();
    public floorRotation: FVector = new FVector();
    public floorScale: FVector = new FVector(1, 1, 1);
    public floorScale3D: FVector = new FVector(1, 1, 1);
    
    // Editor and debugging
    public backgroundFillColor: FColor = new FColor();
    public checkerboardTexture: Lazy<any> | null = null;
    public checkerboardSize: number = 32.0;

    /**
     * Get number of emitters in the particle system
     */
    public getNumEmitters(): number {
        return this.emitters.length;
    }

    /**
     * Check if particle system has physics
     */
    public hasPhysics(): boolean {
        return this.bHasPhysics;
    }

    /**
     * Check if system auto-deactivates when done
     */
    public autoDeactivates(): boolean {
        return this.bAutoDeactivate;
    }

    /**
     * Get system update rate in FPS
     */
    public getUpdateRate(): number {
        return this.updateTime_FPS;
    }

    /**
     * Get system warmup time
     */
    public getWarmupTime(): number {
        return this.warmupTime;
    }

    /**
     * Check if system can be occluded
     */
    public canBeOccluded(): boolean {
        return this.bCanBeOccluded;
    }

    /**
     * Get LOD method used by the system
     */
    public getLODMethod(): number {
        return this.lodMethod;
    }

    /**
     * Get number of LOD levels
     */
    public getNumLODLevels(): number {
        return this.lodDistances.length;
    }

    /**
     * Get LOD distance for specific level
     */
    public getLODDistance(lodLevel: number): number {
        if (lodLevel >= 0 && lodLevel < this.lodDistances.length) {
            return this.lodDistances[lodLevel];
        }
        return 0;
    }

    /**
     * Check if system uses fixed relative bounding box
     */
    public usesFixedBounds(): boolean {
        return this.bUseFixedRelativeBoundingBox;
    }

    /**
     * Get system statistics
     */
    public getStatistics(): any {
        return {
            numEmitters: this.getNumEmitters(),
            hasPhysics: this.hasPhysics(),
            autoDeactivates: this.autoDeactivates(),
            updateRate: this.getUpdateRate(),
            warmupTime: this.getWarmupTime(),
            canBeOccluded: this.canBeOccluded(),
            lodMethod: this.getLODMethod(),
            numLODLevels: this.getNumLODLevels(),
            usesFixedBounds: this.usesFixedBounds(),
            insignificanceDelay: this.insignificanceDelay,
            maxSignificanceLevel: this.maxSignificanceLevel,
            materialSlots: this.namedMaterialSlots.length,
            systemUpdateMode: this.systemUpdateMode
        };
    }

    /**
     * Check if system is suitable for realtime preview
     */
    public isRealtimePreviewEnabled(): boolean {
        return this.bUseRealtimeThumbnail;
    }

    /**
     * Check if system supports async ticking
     */
    public supportsAsyncTick(): boolean {
        return this.bIsElligibleForAsyncTick;
    }

    /**
     * Get material parameter collections used
     */
    public getMaterialParameterCollections(): Array<Lazy<any>> {
        return this.materialParameterCollections;
    }

    /**
     * Check if system has custom material overrides
     */
    public hasCustomMaterials(): boolean {
        return this.namedMaterialSlots.length > 0;
    }
}