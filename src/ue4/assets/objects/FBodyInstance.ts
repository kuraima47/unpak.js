import { FBodyInstanceCore } from "./FBodyInstanceCore";
import { FName } from "../../objects/uobject/FName";
import { ECollisionChannel } from "../enums/ECollisionChannel";
import { FVector } from "../../objects/core/math/FVector";
import { FPackageIndex } from "../../objects/uobject/ObjectResource";

export enum ECollisionEnabled {
    NoCollision,
    QueryOnly,
    PhysicsOnly,
    QueryAndPhysics
}

export enum ESleepFamily { // PhysicsCore
    Normal,
    Sensitive,
    Custom
}

export enum EDOFMode {
    Default,
    SixDOF,
    YZPlane,
    XZPlane,
    XYPlane,
    CustomPlane,
    None
}

export enum ECollisionResponse {
    ECR_Ignore,
    ECR_Overlap,
    ECR_Block
}

export class FCollisionResponseContainer {
    public WorldStatic: ECollisionResponse | null = null
    public WorldDynamic: ECollisionResponse | null = null
    public Pawn: ECollisionResponse | null = null
    public Visibility: ECollisionResponse | null = null
    public Camera: ECollisionResponse | null = null
    public PhysicsBody: ECollisionResponse | null = null
    public Vehicle: ECollisionResponse | null = null
    public Destructible: ECollisionResponse | null = null
    public EngineTraceChannel1: ECollisionResponse | null = null
    public EngineTraceChannel2: ECollisionResponse | null = null
    public EngineTraceChannel3: ECollisionResponse | null = null
    public EngineTraceChannel4: ECollisionResponse | null = null
    public EngineTraceChannel5: ECollisionResponse | null = null
    public EngineTraceChannel6: ECollisionResponse | null = null
    public GameTraceChannel1: ECollisionResponse | null = null
    public GameTraceChannel2: ECollisionResponse | null = null
    public GameTraceChannel3: ECollisionResponse | null = null
    public GameTraceChannel4: ECollisionResponse | null = null
    public GameTraceChannel5: ECollisionResponse | null = null
    public GameTraceChannel6: ECollisionResponse | null = null
    public GameTraceChannel7: ECollisionResponse | null = null
    public GameTraceChannel8: ECollisionResponse | null = null
    public GameTraceChannel9: ECollisionResponse | null = null
    public GameTraceChannel10: ECollisionResponse | null = null
    public GameTraceChannel11: ECollisionResponse | null = null
    public GameTraceChannel12: ECollisionResponse | null = null
    public GameTraceChannel13: ECollisionResponse | null = null
    public GameTraceChannel14: ECollisionResponse | null = null
    public GameTraceChannel15: ECollisionResponse | null = null
    public GameTraceChannel16: ECollisionResponse | null = null
    public GameTraceChannel17: ECollisionResponse | null = null
    public GameTraceChannel18: ECollisionResponse | null = null
}

export class FResponseChannel {
    public Channel!: FName
    public Response!: ECollisionResponse
}


export enum EWalkableSlopeBehavior {
    WalkableSlope_Default,
    WalkableSlope_Increase,
    WalkableSlope_Decrease,
    WalkableSlope_Unwalkable
}

export class FWalkableSlopeOverride {
    public WalkableSlopeBehavior!: EWalkableSlopeBehavior
    public WalkableSlopeAngle: number
}

export class FCollisionResponse {
    public ResponseToChannels: FCollisionResponseContainer | null = null
    public ResponseArray: FResponseChannel[] | null = null
}

export class FBodyInstance extends FBodyInstanceCore {
    public ObjectType: ECollisionChannel | null = null
    public CollisionEnabled: ECollisionEnabled | null = null
    public SleepFamily: ESleepFamily | null = null
    public DOFMode: EDOFMode | null = null
    public bUseCCD: boolean = null
    public bIgnoreAnalyticCollisions: boolean = null
    public bNotifyRigidBodyCollision: boolean = null
    public bLockTranslation: boolean = null
    public bLockRotation: boolean = null
    public bLockXTranslation: boolean = null
    public bLockYTranslation: boolean = null
    public bLockZTranslation: boolean = null
    public bLockXRotation: boolean = null
    public bLockYRotation: boolean = null
    public bLockZRotation: boolean = null
    public bOverrideMaxAngularVelocity: boolean = null
    public bOverrideMaxDepenetrationVelocity: boolean = null
    public bOverrideWalkableSlopeOnInstance: boolean = null
    public bInterpolateWhenSubStepping: boolean = null
    public CollisionProfileName: FName | null = null
    public PositionSolverIterationCount: number = null
    public VelocitySolverIterationCount: number = null
    public CollisionResponses: FCollisionResponse | null = null
    public MaxDepenetrationVelocity: number = null
    public MassInKgOverride: number = null
    public LinearDamping: number = null
    public AngularDamping: number = null
    public CustomDOFPlaneNormal: FVector | null = null
    public COMNudge: FVector | null = null
    public MassScale: number = null
    public InertiaTensorScale: FVector | null = null
    public WalkableSlopeOverride: FWalkableSlopeOverride | null = null
    public PhysMaterialOverride: FPackageIndex /*PhysicalMaterial*/ = null
    public MaxAngularVelocity: number = null
    public CustomSleepThresholdMultiplier: number = null
    public StabilizationThresholdMultiplier: number = null
    public PhysicsBlendWeight: number = null
}