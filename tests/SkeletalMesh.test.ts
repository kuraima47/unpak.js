import { FReferenceSkeleton, FMeshBoneInfo } from "../src/ue4/assets/objects/meshes/FReferenceSkeleton";
import { FSkeletalMeshLODRenderData, FSoftSkinVertex } from "../src/ue4/assets/objects/meshes/FSkeletalMeshLODRenderData";
import { FMeshUVFloat } from "../src/ue4/assets/objects/meshes/FMeshUVFloat";
import { FVector } from "../src/ue4/objects/core/math/FVector";
import { FTransform } from "../src/ue4/objects/core/math/FTransform";
import { FQuat } from "../src/ue4/objects/core/math/FQuat";
import { FBoxSphereBounds } from "../src/ue4/objects/core/math/FBoxSphereBounds";

describe('Skeletal Mesh Core Components', () => {
    describe('FReferenceSkeleton', () => {
        let skeleton: FReferenceSkeleton;

        beforeEach(() => {
            skeleton = new FReferenceSkeleton();
            
            // Add root bone
            const rootBone = new FMeshBoneInfo();
            rootBone.name = "Root";
            rootBone.parentIndex = -1;
            skeleton.refBoneInfo.push(rootBone);
            
            // Add child bone
            const childBone = new FMeshBoneInfo();
            childBone.name = "Child";
            childBone.parentIndex = 0;
            skeleton.refBoneInfo.push(childBone);
            
            // Add bone poses
            const rootPose = new FTransform();
            rootPose.translation = new FVector(0, 0, 0);
            rootPose.rotation = new FQuat(0, 0, 0, 1);
            rootPose.scale3D = new FVector(1, 1, 1);
            skeleton.refBonePose.push(rootPose);
            
            const childPose = new FTransform();
            childPose.translation = new FVector(0, 0, 10);
            childPose.rotation = new FQuat(0, 0, 0, 1);
            childPose.scale3D = new FVector(1, 1, 1);
            skeleton.refBonePose.push(childPose);
        });

        test('should manage bone hierarchy correctly', () => {
            expect(skeleton.findBoneIndex("Root")).toBe(0);
            expect(skeleton.findBoneIndex("Child")).toBe(1);
            expect(skeleton.getBoneParent(1)).toBe(0); // Child's parent is Root
            expect(skeleton.getBoneParent(0)).toBe(-1); // Root has no parent
        });

        test('should handle invalid bone indices', () => {
            expect(skeleton.getBoneParent(-1)).toBe(-1);
            expect(skeleton.getBoneParent(100)).toBe(-1);
        });

        test('should find non-existent bones', () => {
            expect(skeleton.findBoneIndex("NonExistent")).toBe(-1);
        });
    });

    describe('FSkeletalMeshLODRenderData', () => {
        let lodData: FSkeletalMeshLODRenderData;

        beforeEach(() => {
            lodData = new FSkeletalMeshLODRenderData();
            lodData.numVertices = 3;
            lodData.numTexCoords = 1;
            
            // Add simple triangle vertices
            for (let i = 0; i < 3; i++) {
                const vertex = new FSoftSkinVertex();
                vertex.position = new FVector(i * 5, 0, 0);
                vertex.tangentZ = new FVector(0, 0, 1);
                vertex.uvs = [FMeshUVFloat.from(i * 0.5, 0)];
                vertex.influenceBones = [0, 0, 0, 0];
                vertex.influenceWeights = [255, 0, 0, 0];
                lodData.vertices.push(vertex);
            }
            
            // Add indices for a simple triangle
            lodData.indices.push(0, 1, 2);
        });

        test('should have correct vertex count', () => {
            expect(lodData.numVertices).toBe(3);
            expect(lodData.vertices.length).toBe(3);
        });

        test('should have correct texture coordinate count', () => {
            expect(lodData.numTexCoords).toBe(1);
            expect(lodData.vertices[0].uvs.length).toBe(1);
        });

        test('should have valid indices', () => {
            expect(lodData.indices.length).toBe(3);
            expect(lodData.indices).toEqual([0, 1, 2]);
        });

        test('should have correct vertex positions', () => {
            expect(lodData.vertices[0].position.x).toBe(0);
            expect(lodData.vertices[1].position.x).toBe(5);
            expect(lodData.vertices[2].position.x).toBe(10);
        });

        test('should have valid UV coordinates', () => {
            expect(lodData.vertices[0].uvs[0].u).toBe(0);
            expect(lodData.vertices[1].uvs[0].u).toBe(0.5);
            expect(lodData.vertices[2].uvs[0].u).toBe(1.0);
        });
    });

    describe('FSoftSkinVertex', () => {
        test('should create vertex with correct default values', () => {
            const vertex = new FSoftSkinVertex();
            
            expect(vertex.position).toBeInstanceOf(FVector);
            expect(vertex.tangentX).toBeInstanceOf(FVector);
            expect(vertex.tangentY).toBeInstanceOf(FVector);
            expect(vertex.tangentZ).toBeInstanceOf(FVector);
            expect(vertex.uvs).toEqual([]);
            expect(vertex.color).toBe(0xFFFFFFFF);
            expect(vertex.influenceBones).toEqual([0, 0, 0, 0]);
            expect(vertex.influenceWeights).toEqual([255, 0, 0, 0]);
        });

        test('should handle bone influences correctly', () => {
            const vertex = new FSoftSkinVertex();
            vertex.influenceBones = [1, 2, 3, 4];
            vertex.influenceWeights = [128, 64, 32, 16];
            
            expect(vertex.influenceBones).toEqual([1, 2, 3, 4]);
            expect(vertex.influenceWeights).toEqual([128, 64, 32, 16]);
        });
    });

    describe('FMeshBoneInfo', () => {
        test('should create bone info with correct values', () => {
            const boneInfo = new FMeshBoneInfo();
            boneInfo.name = "TestBone";
            boneInfo.parentIndex = 5;
            
            expect(boneInfo.name).toBe("TestBone");
            expect(boneInfo.parentIndex).toBe(5);
        });

        test('should handle root bone correctly', () => {
            const rootBone = new FMeshBoneInfo();
            rootBone.name = "Root";
            rootBone.parentIndex = -1;
            
            expect(rootBone.name).toBe("Root");
            expect(rootBone.parentIndex).toBe(-1);
        });
    });

    describe('FMeshUVFloat', () => {
        test('should create UV coordinates correctly', () => {
            const uv = FMeshUVFloat.from(0.5, 0.8);
            
            expect(uv.u).toBe(0.5);
            expect(uv.v).toBe(0.8);
        });

        test('should handle edge case UV values', () => {
            const uv1 = FMeshUVFloat.from(0, 0);
            const uv2 = FMeshUVFloat.from(1, 1);
            
            expect(uv1.u).toBe(0);
            expect(uv1.v).toBe(0);
            expect(uv2.u).toBe(1);
            expect(uv2.v).toBe(1);
        });
    });
});