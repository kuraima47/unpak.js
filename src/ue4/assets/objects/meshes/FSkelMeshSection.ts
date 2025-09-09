import { FAssetArchive } from "../../reader/FAssetArchive";
import { UnrealArray } from "../../../../util/UnrealArray";

/**
 * Skeletal mesh section representing a contiguous set of triangles
 * Based on CUE4Parse FSkelMeshSection
 */
export class FSkelMeshSection {
    public materialIndex: number = 0;
    public baseIndex: number = 0;
    public numTriangles: number = 0;
    public recomputeTangent: boolean = false;
    public castShadow: boolean = true;
    public baseVertexIndex: number = 0;
    public softVertices: UnrealArray<number> = new UnrealArray();
    public boneMap: UnrealArray<number> = new UnrealArray();
    public numVertices: number = 0;
    public maxBoneInfluences: number = 4;
    public correspondClothAssetIndex: number = -1;
    public clothMappingData: UnrealArray<number> = new UnrealArray();
    public bDisabled: boolean = false;

    constructor(Ar?: FAssetArchive) {
        if (Ar) this.deserialize(Ar);
    }

    public deserialize(Ar: FAssetArchive): void {
        this.materialIndex = Ar.readInt16();
        this.baseIndex = Ar.readUInt32();
        this.numTriangles = Ar.readUInt32();
        this.recomputeTangent = Ar.readBoolean();
        this.castShadow = Ar.readBoolean();
        this.baseVertexIndex = Ar.readUInt32();
        
        const numSoftVertices = Ar.readInt32();
        this.softVertices = new UnrealArray(numSoftVertices, () => Ar.readUInt16());
        
        const numBoneMap = Ar.readInt32();
        this.boneMap = new UnrealArray(numBoneMap, () => Ar.readUInt16());
        
        this.numVertices = Ar.readUInt32();
        this.maxBoneInfluences = Ar.readUInt32();
        this.correspondClothAssetIndex = Ar.readInt16();
        
        const numClothMappingData = Ar.readInt32();
        this.clothMappingData = new UnrealArray(numClothMappingData, () => Ar.readUInt16());
        
        this.bDisabled = Ar.readBoolean();
    }
}
