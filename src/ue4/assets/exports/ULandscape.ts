import { UObject } from "./UObject";
import { FAssetArchive } from "../reader/FAssetArchive";
import { Lazy } from "../../../util/Lazy";
import { FVector } from "../../objects/core/math/FVector";
import { FTransform } from "../../objects/core/math/FTransform";

/**
 * Landscape component data structure
 * Based on CUE4Parse ULandscapeComponent
 */
export class FLandscapeComponentData {
    public sectionBaseX: number = 0;
    public sectionBaseY: number = 0;
    public componentSizeQuads: number = 63;
    public subsectionSizeQuads: number = 15;
    public numSubsections: number = 4;
    public heightmapTexture: Lazy<any> | null = null; // UTexture2D
    public heightmapScaleBias: any | null = null; // FVector4
    public weightmapScaleBias: any | null = null; // FVector4
    public weightmapTextures: Array<Lazy<any>> = [];
    public materialInstance: Lazy<any> | null = null;
    public lightingGuid: string = "";
    public layerWhitelist: Array<string> = [];
    public editToolRenderData: any | null = null;
}

/**
 * Landscape layer data structure
 * Based on CUE4Parse FLandscapeLayerStruct
 */
export class FLandscapeLayer {
    public layerInfoObj: Lazy<any> | null = null; // ULandscapeLayerInfoObject
    public layerName: string = "";
    public blendMode: number = 0; // ELandscapeBlendMode
    public alpha: number = 1.0;
    public bHeightBlend: boolean = false;
    public heightBlendThreshold: number = 0.0;
    public heightBlendFadeRange: number = 0.0;
    public bVisible: boolean = true;
    public bLocked: boolean = false;
    public sourceFilePath: string = "";
}

/**
 * Landscape heightfield data
 * Based on CUE4Parse landscape heightfield system
 */
export class FLandscapeHeightfieldData {
    public heightData: Uint16Array = new Uint16Array();
    public sizeX: number = 0;
    public sizeY: number = 0;
    public scale: FVector = new FVector(100, 100, 100);
    public minHeight: number = 0;
    public maxHeight: number = 65535;
    public heightScale: number = 1.0;
    public heightOffset: number = 0.0;
}

/**
 * Landscape material layer blend info
 * Based on CUE4Parse landscape material system
 */
export class FLandscapeMaterialLayer {
    public materialInterface: Lazy<any> | null = null; // UMaterialInterface
    public layerName: string = "";
    public layerUsageDebugColor: any | null = null; // FLinearColor
    public bNoWeightBlend: boolean = false;
    public layerType: number = 0; // ELandscapeLayerDisplayMode
}

/**
 * Landscape spline data structure
 * Based on CUE4Parse ULandscapeSplineSegment
 */
export class FLandscapeSplineData {
    public splinePoints: Array<FVector> = [];
    public splineTangents: Array<FVector> = [];
    public splineWidths: Array<number> = [];
    public splineFalloffs: Array<number> = [];
    public splineMaterials: Array<Lazy<any>> = [];
    public bClosed: boolean = false;
    public splineResolution: number = 512;
}

/**
 * Landscape terrain asset containing heightmaps, materials, and layer data
 * Based on CUE4Parse ULandscape implementation  
 */
export class ULandscape extends UObject {
    // Core landscape data
    public landscapeTransform: FTransform = new FTransform();
    public landscapeComponents: Array<FLandscapeComponentData> = [];
    public heightfieldData: FLandscapeHeightfieldData = new FLandscapeHeightfieldData();
    
    // Material and layer system
    public landscapeMaterial: Lazy<any> | null = null; // UMaterialInterface
    public landscapeHoleMaterial: Lazy<any> | null = null;
    public landscapeLayers: Array<FLandscapeLayer> = [];
    public materialLayers: Array<FLandscapeMaterialLayer> = [];
    
    // Terrain properties
    public componentSizeQuads: number = 63;
    public subsectionSizeQuads: number = 15;
    public numSubsections: number = 4;
    public componentScreenSizeToUseSubSections: number = 0.65;
    public lodDistanceFactor: number = 1.0;
    public lodFalloff: number = 1.0;
    public negativeZBoundsExtension: number = 0.0;
    public positiveZBoundsExtension: number = 0.0;
    
    // Collision and physics
    public collisionMipLevel: number = 0;
    public collisionThickness: number = 16.0;
    public bodyInstance: any | null = null; // FBodyInstance
    public bUseDynamicMaterialInstance: boolean = false;
    public bCastStaticShadow: boolean = true;
    public bCastShadowAsTwoSided: boolean = false;
    public lightingChannels: any | null = null;
    
    // Optimization settings
    public streamingDistanceMultiplier: number = 1.0;
    public maxLODLevel: number = -1;
    public exportLOD: number = 0;
    public bBakeMaterialPositionOffsetIntoCollision: boolean = false;
    public targetDisplayOrder: number = 0;
    
    // Splines and decoration
    public splineData: Array<FLandscapeSplineData> = [];
    public grassTypes: Array<Lazy<any>> = [];
    public foliageTypes: Array<Lazy<any>> = [];
    
    // Generation and import data
    public importLandscapeData: any | null = null;
    public reimportHeightmapFilePath: string = "";
    public editorLayerSettings: Array<any> = [];
    public landGUID: string = "";
    
    // Runtime optimization
    public bGenerateOverlapEvents: boolean = false;
    public bCanEverAffectNavigation: boolean = true;
    public occluderType: number = 0; // EOccluderType
    public landscapeGuid: string = "";

    /**
     * Get landscape size in components
     */
    public getComponentCount(): number {
        return this.landscapeComponents.length;
    }

    /**
     * Get heightfield dimensions
     */
    public getHeightfieldSize(): { width: number, height: number } {
        return {
            width: this.heightfieldData.sizeX,
            height: this.heightfieldData.sizeY
        };
    }

    /**
     * Get number of material layers
     */
    public getNumLayers(): number {
        return this.landscapeLayers.length;
    }

    /**
     * Find layer by name
     */
    public findLayer(layerName: string): FLandscapeLayer | null {
        return this.landscapeLayers.find(layer => layer.layerName === layerName) || null;
    }

    /**
     * Check if landscape has collision
     */
    public hasCollision(): boolean {
        return this.bodyInstance !== null;
    }

    /**
     * Get landscape scale
     */
    public getScale(): FVector {
        return this.heightfieldData.scale;
    }

    /**
     * Get height range
     */
    public getHeightRange(): { min: number, max: number } {
        return {
            min: this.heightfieldData.minHeight,
            max: this.heightfieldData.maxHeight
        };
    }

    /**
     * Check if landscape has splines
     */
    public hasSplines(): boolean {
        return this.splineData.length > 0;
    }

    /**
     * Get number of grass types
     */
    public getNumGrassTypes(): number {
        return this.grassTypes.length;
    }

    /**
     * Get number of foliage types
     */
    public getNumFoliageTypes(): number {
        return this.foliageTypes.length;
    }

    /**
     * Check if landscape generates overlap events
     */
    public generatesOverlapEvents(): boolean {
        return this.bGenerateOverlapEvents;
    }

    /**
     * Check if landscape affects navigation
     */
    public affectsNavigation(): boolean {
        return this.bCanEverAffectNavigation;
    }

    /**
     * Get LOD settings
     */
    public getLODSettings(): { factor: number, falloff: number, maxLevel: number } {
        return {
            factor: this.lodDistanceFactor,
            falloff: this.lodFalloff,
            maxLevel: this.maxLODLevel
        };
    }

    /**
     * Get landscape statistics
     */
    public getStatistics(): any {
        const heightfieldSize = this.getHeightfieldSize();
        const heightRange = this.getHeightRange();
        
        return {
            componentCount: this.getComponentCount(),
            heightfieldSize: heightfieldSize,
            totalVertices: heightfieldSize.width * heightfieldSize.height,
            numLayers: this.getNumLayers(),
            hasCollision: this.hasCollision(),
            scale: this.getScale(),
            heightRange: heightRange,
            heightSpan: heightRange.max - heightRange.min,
            hasSplines: this.hasSplines(),
            numSplines: this.splineData.length,
            numGrassTypes: this.getNumGrassTypes(),
            numFoliageTypes: this.getNumFoliageTypes(),
            lodSettings: this.getLODSettings(),
            generatesOverlapEvents: this.generatesOverlapEvents(),
            affectsNavigation: this.affectsNavigation(),
            useDynamicMaterial: this.bUseDynamicMaterialInstance,
            castStaticShadow: this.bCastStaticShadow,
            streamingMultiplier: this.streamingDistanceMultiplier
        };
    }

    /**
     * Check if landscape is valid for rendering
     */
    public isValidForRendering(): boolean {
        return this.landscapeComponents.length > 0 && 
               this.heightfieldData.heightData.length > 0 &&
               this.landscapeMaterial !== null;
    }

    /**
     * Get terrain quad size
     */
    public getQuadSize(): number {
        return this.componentSizeQuads;
    }

    /**
     * Get subsection configuration
     */
    public getSubsectionConfig(): { size: number, count: number } {
        return {
            size: this.subsectionSizeQuads,
            count: this.numSubsections
        };
    }
}