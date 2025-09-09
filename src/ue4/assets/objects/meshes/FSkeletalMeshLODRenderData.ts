import { FAssetArchive } from "../../reader/FAssetArchive";
import { FSkelMeshSection } from "./FSkelMeshSection";
import { FVector } from "../../../objects/core/math/FVector";
import { FMeshUVFloat } from "./FMeshUVFloat";

/**
 * Skeletal mesh vertex data structure
 * Based on CUE4Parse FSoftSkinVertex
 */
export class FSoftSkinVertex {
    public position: FVector = new FVector();
    public tangentX: FVector = new FVector();
    public tangentY: FVector = new FVector();
    public tangentZ: FVector = new FVector();
    public uvs: Array<FMeshUVFloat> = [];
    public color: number = 0xFFFFFFFF;
    public influenceBones: Array<number> = [0, 0, 0, 0];
    public influenceWeights: Array<number> = [255, 0, 0, 0];

    constructor(Ar?: FAssetArchive) {
        if (Ar) this.deserialize(Ar);
    }

    public deserialize(Ar: FAssetArchive): void {
        this.position = new FVector(Ar);
        this.tangentX = new FVector(Ar);
        this.tangentY = new FVector(Ar);
        this.tangentZ = new FVector(Ar);
        
        const numTexCoords = Ar.readUInt32();
        this.uvs = [];
        for (let i = 0; i < numTexCoords; i++) {
            this.uvs.push(new FMeshUVFloat(Ar));
        }

        this.color = Ar.readUInt32();

        // Read bone influences (typically 4)
        for (let i = 0; i < 4; i++) {
            this.influenceBones[i] = Ar.readUInt8();
        }

        // Read bone weights (typically 4)
        for (let i = 0; i < 4; i++) {
            this.influenceWeights[i] = Ar.readUInt8();
        }
    }
}

/**
 * Skeletal mesh LOD resource containing geometry and materials
 * Based on CUE4Parse FSkeletalMeshLODRenderData
 */
export class FSkeletalMeshLODRenderData {
    public sections: Array<FSkelMeshSection> = [];
    public indices: Array<number> = [];
    public vertices: Array<FSoftSkinVertex> = [];
    public numVertices: number = 0;
    public numTexCoords: number = 1;
    public requiredBones: Array<number> = [];

    constructor(Ar?: FAssetArchive) {
        if (Ar) this.deserialize(Ar);
    }

    public deserialize(Ar: FAssetArchive): void {
        // Read sections
        const numSections = Ar.readInt32();
        this.sections = [];
        for (let i = 0; i < numSections; i++) {
            this.sections.push(new FSkelMeshSection(Ar));
        }

        // Read indices
        const numIndices = Ar.readInt32();
        this.indices = [];
        for (let i = 0; i < numIndices; i++) {
            this.indices.push(Ar.readUInt16());
        }

        // Read vertex data
        this.numVertices = Ar.readUInt32();
        this.numTexCoords = Ar.readUInt32();

        this.vertices = [];
        for (let i = 0; i < this.numVertices; i++) {
            this.vertices.push(new FSoftSkinVertex(Ar));
        }

        // Read required bones
        const numRequiredBones = Ar.readInt32();
        this.requiredBones = [];
        for (let i = 0; i < numRequiredBones; i++) {
            this.requiredBones.push(Ar.readUInt16());
        }
    }
}
