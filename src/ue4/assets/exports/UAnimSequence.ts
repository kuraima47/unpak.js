import { UObject } from "./UObject";
import { FAssetArchive } from "../reader/FAssetArchive";
import { Lazy } from "../../../util/Lazy";
import { UnrealArray } from "../../../util/UnrealArray";
import { FVector } from "../../objects/core/math/FVector";
import { FQuat } from "../../objects/core/math/FQuat";
import { FTransform } from "../../objects/core/math/FTransform";
import { FNameDummy } from "../../objects/uobject/FName";

/**
 * Animation track data for a single bone
 * Based on CUE4Parse FRawAnimSequenceTrack
 */
export class FRawAnimSequenceTrack {
    public posKeys: Array<FVector> = [];
    public rotKeys: Array<FQuat> = [];
    public scaleKeys: Array<FVector> = [];

    constructor(Ar?: FAssetArchive) {
        if (Ar) this.deserialize(Ar);
    }

    public deserialize(Ar: FAssetArchive): void {
        this.posKeys = Ar.readTArray(() => new FVector(Ar));
        this.rotKeys = Ar.readTArray(() => new FQuat(Ar));
        this.scaleKeys = Ar.readTArray(() => new FVector(Ar));
    }

    public serialize(Ar: FAssetArchive): void {
        // TODO: Implement proper serialization when FArchiveWriter compatibility is resolved
        // For now, stub the calls to avoid build errors
        Ar.writeTArray(this.posKeys, (item) => {
            // item.serialize(Ar); // Commented out until FArchiveWriter compatibility is resolved
        });
        Ar.writeTArray(this.rotKeys, (item) => {
            // item.serialize(Ar); // Commented out until FArchiveWriter compatibility is resolved  
        });
        Ar.writeTArray(this.scaleKeys, (item) => {
            // item.serialize(Ar); // Commented out until FArchiveWriter compatibility is resolved
        });
    }
}

/**
 * Compressed animation curve data
 * Based on CUE4Parse FFloatCurve
 */
export class FFloatCurve {
    public name: string = "";
    public keys: Array<{time: number, value: number}> = [];

    constructor(Ar?: FAssetArchive) {
        if (Ar) this.deserialize(Ar);
    }

    public deserialize(Ar: FAssetArchive): void {
        this.name = Ar.readFName()?.text || "";
        
        const numKeys = Ar.readInt32();
        this.keys = [];
        for (let i = 0; i < numKeys; i++) {
            this.keys.push({
                time: Ar.readFloat(),
                value: Ar.readFloat()
            });
        }
    }

    public serialize(Ar: FAssetArchive): void {
        const nameObj = new FNameDummy(this.name, 0);
        Ar.writeFName(nameObj);
        Ar.writeInt32(this.keys.length);
        for (const key of this.keys) {
            Ar.writeFloat(key.time);
            Ar.writeFloat(key.value);
        }
    }
}

/**
 * Animation sequence asset containing keyframe animation data
 * Based on CUE4Parse UAnimSequence implementation
 */
export class UAnimSequence extends UObject {
    // Core animation data
    public skeleton: Lazy<any> | null = null; // USkeleton
    public sequenceLength: number = 0.0;
    public rawAnimationData: Array<FRawAnimSequenceTrack> = [];
    public compressedAnimationData: Uint8Array = new Uint8Array();
    
    // Animation properties
    public numFrames: number = 0;
    public sampleRate: number = 30.0;
    public importFileFramerate: number = 30.0;
    public importResampleFramerate: number = 0.0;
    
    // Compression settings
    public compressionScheme: Lazy<any> | null = null;
    public bUseRawDataOnly: boolean = false;
    public compressionErrorThresholdScale: number = 1.0;
    
    // Animation notifies and events
    public notifies: Array<any> = [];
    public animNotifyTracks: Array<any> = [];
    
    // Curves
    public rawCurveData: Array<FFloatCurve> = [];
    public compressedCurveData: Uint8Array = new Uint8Array();
    
    // Metadata
    public animationTrackNames: Array<string> = [];
    public trackToSkeletonMapTable: Array<number> = [];
    
    // Root motion
    public bEnableRootMotion: boolean = false;
    public rootMotionRootLock: number = 0; // ERootMotionRootLock
    public bForceRootLock: boolean = false;
    public bUseNormalizedRootMotionScale: boolean = true;
    
    // Additive animation
    public additiveAnimType: number = 0; // EAdditiveAnimationType
    public refPoseType: number = 0; // EAdditiveBasePoseType
    public refPoseSeq: Lazy<UAnimSequence> | null = null;
    public refFrameIndex: number = 0;
    
    // Interpolation
    public interpolation: number = 0; // EAnimInterpolationType
    public retargetSource: string = "";
    
    // Asset references
    public parentAsset: Lazy<any> | null = null;
    public assetImportData: Lazy<any> | null = null;
    public assetUserData: Array<Lazy<any>> = [];

    // Additional properties for compatibility
    public sequenceName: string = "";
    public frameRate: number = 30.0; // Alias for sampleRate
    public compressedTrackOffsets: Array<any> = [];

    constructor(properties: any[] = []) {
        super(properties);
        // Synchronize frameRate with sampleRate
        this.frameRate = this.sampleRate;
    }

    /**
     * Get animation duration in seconds
     */
    public getDuration(): number {
        return this.sequenceLength;
    }

    /**
     * Get number of animation frames
     */
    public getNumFrames(): number {
        return this.numFrames;
    }

    /**
     * Get frame rate of the animation
     */
    public getFrameRate(): number {
        return this.sampleRate;
    }

    /**
     * Check if animation has root motion enabled
     */
    public hasRootMotion(): boolean {
        return this.bEnableRootMotion;
    }

    /**
     * Check if animation is additive
     */
    public isAdditive(): boolean {
        return this.additiveAnimType !== 0; // Not AAT_None
    }

    /**
     * Get track index for bone name
     */
    public findTrackIndex(boneName: string): number {
        return this.animationTrackNames.findIndex(name => name === boneName);
    }

    /**
     * Check if animation has compressed data
     */
    public hasCompressedData(): boolean {
        return this.compressedAnimationData.length > 0;
    }

    /**
     * Check if using raw data only
     */
    public useRawDataOnly(): boolean {
        return this.bUseRawDataOnly;
    }

    /**
     * Get number of animation curves
     */
    public getNumCurves(): number {
        return this.rawCurveData.length;
    }

    /**
     * Get curve by name
     */
    public findCurve(curveName: string): FFloatCurve | null {
        return this.rawCurveData.find(curve => curve.name === curveName) || null;
    }
}