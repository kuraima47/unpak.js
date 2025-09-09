import { FAssetArchive } from "../../reader/FAssetArchive";
import { FVector } from "../../../objects/core/math/FVector";
import { FQuat } from "../../../objects/core/math/FQuat";
import { FTransform } from "../../../objects/core/math/FTransform";

/**
 * Bone reference structure for skeletal mesh
 * Based on CUE4Parse FMeshBoneInfo
 */
export class FMeshBoneInfo {
    public name: string = "";
    public parentIndex: number = -1;

    constructor(Ar?: FAssetArchive) {
        if (Ar) this.deserialize(Ar);
    }

    public deserialize(Ar: FAssetArchive): void {
        this.name = Ar.readFName()?.text || "";
        this.parentIndex = Ar.readInt32();
    }
}

/**
 * Reference skeleton data for skeletal mesh
 * Based on CUE4Parse FReferenceSkeleton
 */
export class FReferenceSkeleton {
    public refBoneInfo: Array<FMeshBoneInfo> = [];
    public refBonePose: Array<FTransform> = [];

    constructor(Ar?: FAssetArchive) {
        if (Ar) this.deserialize(Ar);
    }

    public deserialize(Ar: FAssetArchive): void {
        const numBones = Ar.readInt32();
        
        this.refBoneInfo = [];
        for (let i = 0; i < numBones; i++) {
            this.refBoneInfo.push(new FMeshBoneInfo(Ar));
        }

        this.refBonePose = [];
        for (let i = 0; i < numBones; i++) {
            this.refBonePose.push(new FTransform(Ar));
        }
    }

    public findBoneIndex(boneName: string): number {
        return this.refBoneInfo.findIndex(bone => bone.name === boneName);
    }

    public getBoneParent(boneIndex: number): number {
        if (boneIndex >= 0 && boneIndex < this.refBoneInfo.length) {
            return this.refBoneInfo[boneIndex].parentIndex;
        }
        return -1;
    }
}