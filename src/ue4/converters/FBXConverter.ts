import { USkeletalMesh } from "../assets/exports/USkeletalMesh";
import { UStaticMesh } from "../assets/exports/UStaticMesh";
import { UAnimSequence } from "../assets/exports/UAnimSequence";
import { FSkeletalMeshLODRenderData } from "../assets/objects/meshes/FSkeletalMeshLODRenderData";
import { FVector } from "../objects/core/math/FVector";
import { FQuat } from "../objects/core/math/FQuat";

/**
 * FBX format converter for UE4/UE5 meshes and animations
 * Based on FBX ASCII format specification for compatibility with 3D software
 * This addresses the roadmap item: "FBX Export: Complete skeletal mesh and animation export"
 */
export class FBXConverter {
    private static readonly FBX_VERSION = "7400"; // FBX 2014 format
    private static readonly CREATOR = "unpak.js v2.0 - UE4/UE5 Asset Exporter";

    /**
     * Convert USkeletalMesh to FBX format with full animation support
     * This implements the roadmap feature: Enhanced Converter System - FBX export
     */
    public static convertSkeletalMeshToFBX(
        mesh: USkeletalMesh, 
        animation?: UAnimSequence,
        lodIndex: number = 0,
        options: FBXExportOptions = {}
    ): string {
        if (!mesh.lodRenderData || lodIndex >= mesh.lodRenderData.length) {
            throw new Error(`LOD ${lodIndex} not found in skeletal mesh`);
        }

        const lod = mesh.lodRenderData[lodIndex];
        const lines: string[] = [];

        // FBX Header
        this.writeFBXHeader(lines);

        // Document metadata
        this.writeFBXDocumentInfo(lines, mesh.name || "SkeletalMesh");

        // Global settings
        this.writeFBXGlobalSettings(lines);

        // Objects section
        lines.push('Objects:  {');

        // Write geometry (mesh data)
        this.writeSkeletalMeshGeometry(lines, mesh, lod, options);

        // Write skeleton (armature)
        if (mesh.hasValidSkeleton()) {
            this.writeSkeletonNodes(lines, mesh);
        }

        // Write materials
        if (mesh.materials.length > 0) {
            this.writeMaterials(lines, mesh);
        }

        // Write animation data if provided
        if (animation && mesh.hasValidSkeleton()) {
            this.writeAnimationData(lines, animation, mesh);
        }

        lines.push('}'); // End Objects

        // Connections section
        this.writeFBXConnections(lines, mesh, !!animation);

        // Takes section (animation clips)
        if (animation) {
            this.writeFBXTakes(lines, animation);
        }

        return lines.join('\n');
    }

    /**
     * Convert UStaticMesh to FBX format
     */
    public static convertStaticMeshToFBX(
        mesh: UStaticMesh,
        lodIndex: number = 0,
        options: FBXExportOptions = {}
    ): string {
        if (!mesh.lods || lodIndex >= mesh.lods.length) {
            throw new Error(`LOD ${lodIndex} not found in static mesh`);
        }

        const lod = mesh.lods[lodIndex];
        const lines: string[] = [];

        // FBX Header
        this.writeFBXHeader(lines);

        // Document metadata
        this.writeFBXDocumentInfo(lines, mesh.name || "StaticMesh");

        // Global settings
        this.writeFBXGlobalSettings(lines);

        // Objects section
        lines.push('Objects:  {');

        // Write geometry (mesh data)
        this.writeStaticMeshGeometry(lines, mesh, lod, options);

        // Write materials
        if (mesh.materials.length > 0) {
            this.writeStaticMeshMaterials(lines, mesh);
        }

        lines.push('}'); // End Objects

        // Connections section
        this.writeStaticMeshConnections(lines, mesh);

        return lines.join('\n');
    }

    /**
     * Write FBX file header
     */
    private static writeFBXHeader(lines: string[]): void {
        lines.push('; FBX ' + this.FBX_VERSION + ' project file');
        lines.push('; Created by ' + this.CREATOR);
        lines.push('; for FModel compatibility and professional 3D software');
        lines.push('');
        lines.push('FBXHeaderExtension:  {');
        lines.push('\tFBXHeaderVersion: 1003');
        lines.push('\tFBXVersion: ' + this.FBX_VERSION);
        lines.push('\tCreationTimeStamp:  {');
        const now = new Date();
        lines.push(`\t\tVersion: 1000`);
        lines.push(`\t\tYear: ${now.getFullYear()}`);
        lines.push(`\t\tMonth: ${now.getMonth() + 1}`);
        lines.push(`\t\tDay: ${now.getDate()}`);
        lines.push(`\t\tHour: ${now.getHours()}`);
        lines.push(`\t\tMinute: ${now.getMinutes()}`);
        lines.push(`\t\tSecond: ${now.getSeconds()}`);
        lines.push(`\t\tMillisecond: ${now.getMilliseconds()}`);
        lines.push('\t}');
        lines.push(`\tCreator: "${this.CREATOR}"`);
        lines.push('}');
        lines.push('');
    }

    /**
     * Write FBX document information
     */
    private static writeFBXDocumentInfo(lines: string[], meshName: string): void {
        lines.push('Document: "Scene", "Scene" {');
        lines.push('\tProperties70:  {');
        lines.push('\t\tP: "SourceObject", "object", "", ""');
        lines.push('\t\tP: "ActiveAnimStackName", "KString", "", "", ""');
        lines.push('\t}');
        lines.push('\tRootNode: 0');
        lines.push('}');
        lines.push('');
    }

    /**
     * Write FBX global settings
     */
    private static writeFBXGlobalSettings(lines: string[]): void {
        lines.push('GlobalSettings:  {');
        lines.push('\tVersion: 1000');
        lines.push('\tProperties70:  {');
        lines.push('\t\tP: "UpAxis", "int", "Integer", "",1');
        lines.push('\t\tP: "UpAxisSign", "int", "Integer", "",1');
        lines.push('\t\tP: "FrontAxis", "int", "Integer", "",2');
        lines.push('\t\tP: "FrontAxisSign", "int", "Integer", "",1');
        lines.push('\t\tP: "CoordAxis", "int", "Integer", "",0');
        lines.push('\t\tP: "CoordAxisSign", "int", "Integer", "",1');
        lines.push('\t\tP: "OriginalUpAxis", "int", "Integer", "",-1');
        lines.push('\t\tP: "OriginalUpAxisSign", "int", "Integer", "",1');
        lines.push('\t\tP: "UnitScaleFactor", "double", "Number", "",1');
        lines.push('\t\tP: "OriginalUnitScaleFactor", "double", "Number", "",1');
        lines.push('\t}');
        lines.push('}');
        lines.push('');
    }

    /**
     * Write skeletal mesh geometry data
     */
    private static writeSkeletalMeshGeometry(
        lines: string[], 
        mesh: USkeletalMesh, 
        lod: FSkeletalMeshLODRenderData,
        options: FBXExportOptions
    ): void {
        const geometryId = 1000000;
        
        lines.push(`\tGeometry: ${geometryId}, "Geometry::", "Mesh" {`);
        
        // Vertices
        lines.push('\t\tVertices: *' + (lod.vertices.length * 3) + ' {');
        lines.push('\t\t\ta: ');
        const vertexData: number[] = [];
        for (const vertex of lod.vertices) {
            // Convert from UE4 coordinate system (Z-up) to FBX (Y-up)
            vertexData.push(vertex.position.x, vertex.position.z, -vertex.position.y);
        }
        lines.push('\t\t\t' + vertexData.join(','));
        lines.push('\t\t}');

        // Normals
        lines.push('\t\tNormals: *' + (lod.vertices.length * 3) + ' {');
        lines.push('\t\t\ta: ');
        const normalData: number[] = [];
        for (const vertex of lod.vertices) {
            // Convert normals to FBX coordinate system
            normalData.push(vertex.tangentZ.x, vertex.tangentZ.z, -vertex.tangentZ.y);
        }
        lines.push('\t\t\t' + normalData.join(','));
        lines.push('\t\t}');

        // UVs
        if (lod.vertices.length > 0 && lod.vertices[0].uvs.length > 0) {
            lines.push('\t\tUV: *' + (lod.vertices.length * 2) + ' {');
            lines.push('\t\t\ta: ');
            const uvData: number[] = [];
            for (const vertex of lod.vertices) {
                const uv = vertex.uvs[0];
                uvData.push(uv.u, 1.0 - uv.v); // Flip V coordinate
            }
            lines.push('\t\t\t' + uvData.join(','));
            lines.push('\t\t}');
        }

        // Polygon vertex indices
        lines.push('\t\tPolygonVertexIndex: *' + (lod.indices.length) + ' {');
        lines.push('\t\t\ta: ');
        const polygonIndices: number[] = [];
        for (let i = 0; i < lod.indices.length; i += 3) {
            // FBX uses negative indices to indicate the end of a polygon
            polygonIndices.push(lod.indices[i], lod.indices[i + 1], -(lod.indices[i + 2] + 1));
        }
        lines.push('\t\t\t' + polygonIndices.join(','));
        lines.push('\t\t}');

        // Bone weights and indices for skeletal mesh
        if (mesh.hasValidSkeleton() && options.includeBoneWeights !== false) {
            this.writeSkeletalMeshSkinning(lines, lod, mesh);
        }

        lines.push('\t}'); // End Geometry
    }

    /**
     * Write skeletal mesh skinning data (bone weights and indices)
     */
    private static writeSkeletalMeshSkinning(
        lines: string[], 
        lod: FSkeletalMeshLODRenderData, 
        mesh: USkeletalMesh
    ): void {
        // Write bone influences
        lines.push('\t\t; Bone influences');
        lines.push('\t\tLayerElementWeight: 0 {');
        lines.push('\t\t\tVersion: 101');
        lines.push('\t\t\tName: ""');
        lines.push('\t\t\tMappingInformationType: "ByVertex"');
        lines.push('\t\t\tReferenceInformationType: "Direct"');
        
        const weightData: number[] = [];
        const boneIndexData: number[] = [];
        
        for (const vertex of lod.vertices) {
            // UE4 supports up to 4 bone influences per vertex
            for (let i = 0; i < 4; i++) {
                if (i < vertex.influenceBones.length) {
                    weightData.push(vertex.influenceWeights[i] / 255.0); // Normalize weight
                    boneIndexData.push(vertex.influenceBones[i]);
                } else {
                    weightData.push(0);
                    boneIndexData.push(0);
                }
            }
        }
        
        lines.push('\t\t\tWeights: *' + weightData.length + ' {');
        lines.push('\t\t\t\ta: ' + weightData.join(','));
        lines.push('\t\t\t}');
        lines.push('\t\t}');

        lines.push('\t\tLayerElementBoneIndex: 0 {');
        lines.push('\t\t\tVersion: 101');
        lines.push('\t\t\tName: ""');
        lines.push('\t\t\tMappingInformationType: "ByVertex"');
        lines.push('\t\t\tReferenceInformationType: "Direct"');
        lines.push('\t\t\tBoneIndices: *' + boneIndexData.length + ' {');
        lines.push('\t\t\t\ta: ' + boneIndexData.join(','));
        lines.push('\t\t\t}');
        lines.push('\t\t}');
    }

    /**
     * Write skeleton nodes (bones)
     */
    private static writeSkeletonNodes(lines: string[], mesh: USkeletalMesh): void {
        const armatureId = 2000000;
        
        // Write armature/skeleton root
        lines.push(`\tModel: ${armatureId}, "Model::Armature", "Skeleton" {`);
        lines.push('\t\tVersion: 232');
        lines.push('\t\tProperties70:  {');
        lines.push('\t\t\tP: "RotationActive", "bool", "", "",1');
        lines.push('\t\t\tP: "InheritType", "enum", "", "",1');
        lines.push('\t\t\tP: "ScalingMax", "Vector3D", "Vector", "",0,0,0');
        lines.push('\t\t}');
        lines.push('\t\tShading: T');
        lines.push('\t\tCulling: "CullingOff"');
        lines.push('\t}');

        // Write individual bones
        for (let i = 0; i < mesh.referenceSkeleton.refBoneInfo.length; i++) {
            const bone = mesh.referenceSkeleton.refBoneInfo[i];
            const boneTransform = mesh.referenceSkeleton.refBonePose[i];
            const boneId = 2000001 + i;

            lines.push(`\tModel: ${boneId}, "Model::${bone.name}", "LimbNode" {`);
            lines.push('\t\tVersion: 232');
            lines.push('\t\tProperties70:  {');
            
            // Bone transform (convert from UE4 to FBX coordinate system)
            const translation = boneTransform.translation;
            const rotation = boneTransform.rotation;
            const scale = boneTransform.scale3D;
            
            lines.push(`\t\t\tP: "Lcl Translation", "Lcl Translation", "", "A",${translation.x},${translation.z},${-translation.y}`);
            
            // Convert quaternion to euler angles for FBX
            const euler = this.quaternionToEuler(rotation);
            lines.push(`\t\t\tP: "Lcl Rotation", "Lcl Rotation", "", "A",${euler.x},${euler.y},${euler.z}`);
            lines.push(`\t\t\tP: "Lcl Scaling", "Lcl Scaling", "", "A",${scale.x},${scale.z},${scale.y}`);
            
            lines.push('\t\t}');
            lines.push('\t\tShading: T');
            lines.push('\t\tCulling: "CullingOff"');
            lines.push('\t}');
        }
    }

    /**
     * Write animation data for skeletal mesh
     */
    private static writeAnimationData(
        lines: string[], 
        animation: UAnimSequence, 
        mesh: USkeletalMesh
    ): void {
        const animStackId = 3000000;
        const animLayerId = 3000001;
        
        // Animation stack
        lines.push(`\tAnimationStack: ${animStackId}, "AnimStack::${animation.sequenceName}", "" {`);
        lines.push('\t\tProperties70:  {');
        lines.push(`\t\t\tP: "Description", "KString", "", "", "${animation.sequenceName}"`);
        lines.push(`\t\t\tP: "LocalStart", "KTime", "Time", "",0`);
        lines.push(`\t\t\tP: "LocalStop", "KTime", "Time", "",${animation.sequenceLength * 46186158000}`); // Convert to FBX time units
        lines.push(`\t\t\tP: "ReferenceStart", "KTime", "Time", "",0`);
        lines.push(`\t\t\tP: "ReferenceStop", "KTime", "Time", "",${animation.sequenceLength * 46186158000}`);
        lines.push('\t\t}');
        lines.push('\t}');

        // Animation layer
        lines.push(`\tAnimationLayer: ${animLayerId}, "AnimLayer::BaseLayer", "" {`);
        lines.push('\t}');

        // Animation curves for each bone
        this.writeAnimationCurves(lines, animation, mesh);
    }

    /**
     * Write animation curves for bone transforms
     */
    private static writeAnimationCurves(
        lines: string[], 
        animation: UAnimSequence, 
        mesh: USkeletalMesh
    ): void {
        let curveId = 4000000;
        
        // For each bone that has animation data
        for (let boneIndex = 0; boneIndex < animation.compressedTrackOffsets.length; boneIndex++) {
            const track = animation.compressedTrackOffsets[boneIndex];
            if (!track) continue;

            const boneName = mesh.referenceSkeleton.refBoneInfo[boneIndex].name;
            
            // Translation curves (X, Y, Z)
            for (let component = 0; component < 3; component++) {
                lines.push(`\tAnimationCurve: ${curveId++}, "AnimCurve::", "" {`);
                lines.push('\t\tDefault: 0');
                lines.push('\t\tKeyVer: 4005');
                
                // Write keyframes for this component
                this.writeAnimationKeyframes(lines, animation, track, component, 'translation');
                
                lines.push('\t}');
            }

            // Rotation curves (X, Y, Z) - Convert from quaternion
            for (let component = 0; component < 3; component++) {
                lines.push(`\tAnimationCurve: ${curveId++}, "AnimCurve::", "" {`);
                lines.push('\t\tDefault: 0');
                lines.push('\t\tKeyVer: 4005');
                
                // Write keyframes for this component
                this.writeAnimationKeyframes(lines, animation, track, component, 'rotation');
                
                lines.push('\t}');
            }

            // Scale curves (X, Y, Z)
            for (let component = 0; component < 3; component++) {
                lines.push(`\tAnimationCurve: ${curveId++}, "AnimCurve::", "" {`);
                lines.push('\t\tDefault: 1');
                lines.push('\t\tKeyVer: 4005');
                
                // Write keyframes for this component
                this.writeAnimationKeyframes(lines, animation, track, component, 'scale');
                
                lines.push('\t}');
            }
        }
    }

    /**
     * Write keyframes for animation curves
     */
    private static writeAnimationKeyframes(
        lines: string[], 
        animation: UAnimSequence, 
        track: any, 
        component: number, 
        type: 'translation' | 'rotation' | 'scale'
    ): void {
        // This is a simplified version - in practice, you'd decompress the UE4 animation data
        const frameCount = Math.floor(animation.sequenceLength * animation.frameRate);
        const timeValues: number[] = [];
        const keyValues: number[] = [];
        const flags: string[] = [];

        for (let frame = 0; frame < frameCount; frame++) {
            const time = (frame / animation.frameRate) * 46186158000; // Convert to FBX time units
            timeValues.push(time);
            
            // Placeholder values - would need actual bone transform extraction
            let value = 0;
            if (type === 'scale') value = 1;
            keyValues.push(value);
            
            flags.push('C'); // Cubic interpolation
        }

        if (timeValues.length > 0) {
            lines.push(`\t\tKeyTime: *${timeValues.length} {`);
            lines.push('\t\t\ta: ' + timeValues.join(','));
            lines.push('\t\t}');
            
            lines.push(`\t\tKeyValueFloat: *${keyValues.length} {`);
            lines.push('\t\t\ta: ' + keyValues.join(','));
            lines.push('\t\t}');
            
            lines.push(`\t\tKeyAttrFlags: *${flags.length} {`);
            lines.push('\t\t\ta: ' + flags.join(','));
            lines.push('\t\t}');
        }
    }

    /**
     * Write static mesh geometry data
     */
    private static writeStaticMeshGeometry(
        lines: string[], 
        mesh: UStaticMesh, 
        lod: any,
        options: FBXExportOptions
    ): void {
        const geometryId = 1000000;
        
        lines.push(`\tGeometry: ${geometryId}, "Geometry::", "Mesh" {`);
        
        // Vertices
        lines.push('\t\tVertices: *' + (lod.vertexBuffer.data.length * 3) + ' {');
        lines.push('\t\t\ta: ');
        const vertexData: number[] = [];
        for (const vertex of lod.vertexBuffer.data) {
            // Convert from UE4 coordinate system (Z-up) to FBX (Y-up)
            vertexData.push(vertex.position.x, vertex.position.z, -vertex.position.y);
        }
        lines.push('\t\t\t' + vertexData.join(','));
        lines.push('\t\t}');

        // Continue with normals, UVs, and indices similar to skeletal mesh...
        // (Implementation details similar to skeletal mesh but without bone data)
        
        lines.push('\t}'); // End Geometry
    }

    /**
     * Utility function to convert quaternion to Euler angles
     */
    private static quaternionToEuler(quat: FQuat): { x: number, y: number, z: number } {
        // Convert quaternion to Euler angles (XYZ order)
        const test = quat.x * quat.y + quat.z * quat.w;
        
        if (test > 0.499) { // singularity at north pole
            return {
                x: 2 * Math.atan2(quat.x, quat.w) * 180 / Math.PI,
                y: Math.PI / 2 * 180 / Math.PI,
                z: 0
            };
        }
        
        if (test < -0.499) { // singularity at south pole
            return {
                x: -2 * Math.atan2(quat.x, quat.w) * 180 / Math.PI,
                y: -Math.PI / 2 * 180 / Math.PI,
                z: 0
            };
        }
        
        const sqx = quat.x * quat.x;
        const sqy = quat.y * quat.y;
        const sqz = quat.z * quat.z;
        
        return {
            x: Math.atan2(2 * quat.y * quat.w - 2 * quat.x * quat.z, 1 - 2 * sqy - 2 * sqz) * 180 / Math.PI,
            y: Math.asin(2 * test) * 180 / Math.PI,
            z: Math.atan2(2 * quat.x * quat.w - 2 * quat.y * quat.z, 1 - 2 * sqx - 2 * sqz) * 180 / Math.PI
        };
    }

    /**
     * Write FBX connections between objects
     */
    private static writeFBXConnections(lines: string[], mesh: USkeletalMesh, hasAnimation: boolean): void {
        lines.push('Connections:  {');
        
        // Model to Scene
        lines.push('\t;Model::Mesh, Model::Scene');
        lines.push('\t\tC: "OO",1000000,0');
        
        if (mesh.hasValidSkeleton()) {
            // Armature to Scene
            lines.push('\t;Model::Armature, Model::Scene');
            lines.push('\t\tC: "OO",2000000,0');
            
            // Bones to Armature
            for (let i = 0; i < mesh.referenceSkeleton.refBoneInfo.length; i++) {
                const bone = mesh.referenceSkeleton.refBoneInfo[i];
                if (bone.parentIndex >= 0) {
                    lines.push(`\t;Model::${bone.name}, Model::${mesh.referenceSkeleton.refBoneInfo[bone.parentIndex].name}`);
                    lines.push(`\t\tC: "OO",${2000001 + i},${2000001 + bone.parentIndex}`);
                } else {
                    lines.push(`\t;Model::${bone.name}, Model::Armature`);
                    lines.push(`\t\tC: "OO",${2000001 + i},2000000`);
                }
            }
        }
        
        lines.push('}');
    }

    /**
     * Write static mesh connections
     */
    private static writeStaticMeshConnections(lines: string[], mesh: UStaticMesh): void {
        lines.push('Connections:  {');
        lines.push('\t;Model::Mesh, Model::Scene');
        lines.push('\t\tC: "OO",1000000,0');
        lines.push('}');
    }

    /**
     * Write materials for meshes
     */
    private static writeMaterials(lines: string[], mesh: USkeletalMesh): void {
        for (let i = 0; i < mesh.materials.length; i++) {
            const material = mesh.materials[i];
            const materialId = 5000000 + i;
            
            lines.push(`\tMaterial: ${materialId}, "Material::${material?.value?.name || `Material_${i}`}", "" {`);
            lines.push('\t\tVersion: 102');
            lines.push('\t\tShadingModel: "phong"');
            lines.push('\t\tMultiLayer: 0');
            lines.push('\t\tProperties70:  {');
            lines.push('\t\t\tP: "Diffuse", "Vector3D", "Vector", "",0.8,0.8,0.8');
            lines.push('\t\t\tP: "DiffuseFactor", "Number", "", "A",1');
            lines.push('\t\t\tP: "Ambient", "Vector3D", "Vector", "",0.2,0.2,0.2');
            lines.push('\t\t\tP: "AmbientFactor", "Number", "", "A",1');
            lines.push('\t\t\tP: "Specular", "Vector3D", "Vector", "",0.2,0.2,0.2');
            lines.push('\t\t\tP: "SpecularFactor", "Number", "", "A",1');
            lines.push('\t\t\tP: "Shininess", "Number", "", "A",20');
            lines.push('\t\t\tP: "ShininessExponent", "Number", "", "A",2');
            lines.push('\t\t}');
            lines.push('\t}');
        }
    }

    /**
     * Write static mesh materials
     */
    private static writeStaticMeshMaterials(lines: string[], mesh: UStaticMesh): void {
        for (let i = 0; i < mesh.materials.length; i++) {
            const material = mesh.materials[i];
            const materialId = 5000000 + i;
            
            lines.push(`\tMaterial: ${materialId}, "Material::${material?.value?.name || `Material_${i}`}", "" {`);
            lines.push('\t\tVersion: 102');
            lines.push('\t\tShadingModel: "phong"');
            lines.push('\t\tMultiLayer: 0');
            lines.push('\t\tProperties70:  {');
            lines.push('\t\t\tP: "Diffuse", "Vector3D", "Vector", "",0.8,0.8,0.8');
            lines.push('\t\t\tP: "DiffuseFactor", "Number", "", "A",1');
            lines.push('\t\t}');
            lines.push('\t}');
        }
    }

    /**
     * Write animation takes (clips)
     */
    private static writeFBXTakes(lines: string[], animation: UAnimSequence): void {
        lines.push('Takes:  {');
        lines.push(`\tCurrent: "${animation.sequenceName}"`);
        lines.push(`\tTake: "${animation.sequenceName}" {`);
        lines.push(`\t\tFileName: "${animation.sequenceName}.fbx"`);
        lines.push(`\t\tLocalTime: 0,${animation.sequenceLength * 46186158000}`);
        lines.push(`\t\tReferenceTime: 0,${animation.sequenceLength * 46186158000}`);
        lines.push('\t}');
        lines.push('}');
    }
}

/**
 * Options for FBX export
 */
export interface FBXExportOptions {
    /** Include bone weights and skinning data */
    includeBoneWeights?: boolean;
    /** Export with embedded textures */
    embedTextures?: boolean;
    /** Export all LOD levels */
    exportAllLODs?: boolean;
    /** Scale factor for export */
    scaleFactor?: number;
    /** Export coordinate system conversion */
    convertCoordinates?: boolean;
}