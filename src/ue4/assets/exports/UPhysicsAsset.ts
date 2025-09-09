import { UObject } from "./UObject";
import { FAssetArchive } from "../reader/FAssetArchive";
import { Lazy } from "../../../util/Lazy";
import { FVector } from "../../objects/core/math/FVector";
import { FQuat } from "../../objects/core/math/FQuat";
import { FTransform } from "../../objects/core/math/FTransform";

/**
 * Physics constraint setup data
 * Based on CUE4Parse FConstraintSetup
 */
export class FConstraintSetup {
    public jointName: string = "";
    public constraintBone1: string = "";
    public constraintBone2: string = "";
    public pos1: FVector = new FVector();
    public priAxis1: FVector = new FVector();
    public secAxis1: FVector = new FVector();
    public pos2: FVector = new FVector();
    public priAxis2: FVector = new FVector();
    public secAxis2: FVector = new FVector();
    public bEnableProjection: boolean = false;
    public projectionLinearTolerance: number = 0.1;
    public projectionAngularTolerance: number = 0.1;
    
    // Linear limits
    public bLinearXLimited: boolean = false;
    public bLinearYLimited: boolean = false;
    public bLinearZLimited: boolean = false;
    public linearLimitSize: FVector = new FVector();
    public bLinearLimitSoft: boolean = false;
    public linearLimitStiffness: number = 0;
    public linearLimitDamping: number = 0;
    
    // Angular limits  
    public bTwistLimited: boolean = false;
    public bSwing1Limited: boolean = false;
    public bSwing2Limited: boolean = false;
    public twistLimitAngle: number = 0;
    public swing1LimitAngle: number = 0;
    public swing2LimitAngle: number = 0;
    public bAngularLimitSoft: boolean = false;
    public angularLimitStiffness: number = 0;
    public angularLimitDamping: number = 0;
}

/**
 * Physics body setup for collision
 * Based on CUE4Parse FKAggregateGeom  
 */
export class FKAggregateGeom {
    public sphereElems: Array<any> = [];
    public boxElems: Array<any> = [];
    public sphylElems: Array<any> = [];
    public convexElems: Array<any> = [];
    public taperedCapsuleElems: Array<any> = [];
}

/**
 * Physics bone data structure
 * Based on CUE4Parse FRigidBodyBase
 */
export class FRigidBodyBase {
    public boneName: string = "";
    public pos: FVector = new FVector();
    public quat: FQuat = new FQuat();
    public bFixed: boolean = false;
    public enableCollision: boolean = true;
    public collisionReponse: number = 1; // ECR_Block
}

/**
 * Physics asset containing collision and joint data for skeletal meshes
 * Based on CUE4Parse UPhysicsAsset implementation
 */
export class UPhysicsAsset extends UObject {
    // Core physics data
    public skeletalBodySetups: Array<Lazy<any>> = []; // UBodySetup objects
    public constraintSetups: Array<FConstraintSetup> = [];
    public defaultSkelMesh: Lazy<any> | null = null; // USkeletalMesh
    
    // Physics simulation settings
    public defaultInstance: any | null = null; // UPhysicsAssetInstance
    public solverIterationCount: number = 8;
    public solverPositionIterationCount: number = 1;
    public solverVelocityIterationCount: number = 1;
    public bUseAsyncScene: boolean = false;
    public bNotifyRigidBodyCollision: boolean = false;
    
    // Collision settings
    public defaultCollisionProfile: string = "PhysicsActor";
    public boundsBodies: Array<number> = [];
    public spatiallyDenseBodies: Array<number> = [];
    
    // Optimization settings
    public enabledBodyIndices: Array<number> = [];
    public physicsType: number = 0; // EPhysicsType
    public bConsiderAllBodiesForBounds: boolean = true;
    
    // Thumbnail and preview
    public thumbnailInfo: Lazy<any> | null = null;
    public bodySetupIndexMap: Map<string, number> = new Map();

    /**
     * Get number of physics bodies
     */
    public getNumBodies(): number {
        return this.skeletalBodySetups.length;
    }

    /**
     * Get number of physics constraints
     */
    public getNumConstraints(): number {
        return this.constraintSetups.length;
    }

    /**
     * Find body setup index for bone name
     */
    public findBodyIndex(boneName: string): number {
        return this.bodySetupIndexMap.get(boneName) ?? -1;
    }

    /**
     * Check if bone has physics body
     */
    public hasBoneBody(boneName: string): boolean {
        return this.bodySetupIndexMap.has(boneName);
    }

    /**
     * Get constraint setup by joint name
     */
    public findConstraint(jointName: string): FConstraintSetup | null {
        return this.constraintSetups.find(constraint => constraint.jointName === jointName) || null;
    }

    /**
     * Check if physics asset has any collision
     */
    public hasCollision(): boolean {
        return this.skeletalBodySetups.length > 0;
    }

    /**
     * Check if physics asset has any constraints
     */
    public hasConstraints(): boolean {
        return this.constraintSetups.length > 0;
    }

    /**
     * Get all bone names with physics bodies
     */
    public getPhysicsBoneNames(): Array<string> {
        return Array.from(this.bodySetupIndexMap.keys());
    }

    /**
     * Get physics asset statistics
     */
    public getStatistics(): any {
        return {
            numBodies: this.getNumBodies(),
            numConstraints: this.getNumConstraints(),
            hasCollision: this.hasCollision(),
            hasConstraints: this.hasConstraints(),
            solverIterations: this.solverIterationCount,
            positionIterations: this.solverPositionIterationCount,
            velocityIterations: this.solverVelocityIterationCount,
            asyncScene: this.bUseAsyncScene,
            notifyCollision: this.bNotifyRigidBodyCollision,
            collisionProfile: this.defaultCollisionProfile,
            physicsBones: this.getPhysicsBoneNames()
        };
    }

    /**
     * Check if bone collision is enabled
     */
    public isBoneCollisionEnabled(boneName: string): boolean {
        const bodyIndex = this.findBodyIndex(boneName);
        return bodyIndex >= 0 && this.enabledBodyIndices.includes(bodyIndex);
    }

    /**
     * Get constraint between two bones
     */
    public findConstraintBetweenBones(bone1: string, bone2: string): FConstraintSetup | null {
        return this.constraintSetups.find(constraint => 
            (constraint.constraintBone1 === bone1 && constraint.constraintBone2 === bone2) ||
            (constraint.constraintBone1 === bone2 && constraint.constraintBone2 === bone1)
        ) || null;
    }

    /**
     * Check if asset is suitable for simulation
     */
    public isValidForSimulation(): boolean {
        return this.hasCollision() && this.defaultSkelMesh !== null;
    }
}