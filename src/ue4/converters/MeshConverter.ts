import { USkeletalMesh } from "../assets/exports/USkeletalMesh";
import { UStaticMesh } from "../assets/exports/UStaticMesh";
import { FSkeletalMeshLODRenderData } from "../assets/objects/meshes/FSkeletalMeshLODRenderData";
import { FStaticMeshLODResources } from "../assets/objects/meshes/FStaticMeshLODResources";
import { FVector } from "../objects/core/math/FVector";

/**
 * 3D mesh converter for exporting UE4/UE5 meshes to standard formats
 * Based on CUE4Parse mesh export capabilities and FModel export system
 */
export class MeshConverter {
    
    /**
     * Convert UStaticMesh to OBJ format
     */
    public static convertStaticMeshToOBJ(mesh: UStaticMesh, lodIndex: number = 0): string {
        if (!mesh.lods || lodIndex >= mesh.lods.length) {
            throw new Error(`LOD ${lodIndex} not found in static mesh`);
        }

        const lod = mesh.lods[lodIndex];
        const lines: string[] = [];
        
        // OBJ header
        lines.push('# Exported from unpak.js');
        lines.push('# Static Mesh Export');
        lines.push('');

        // Export vertices
        lines.push('# Vertices');
        for (const vertex of lod.vertexBuffer.data) {
            const pos = vertex.position;
            lines.push(`v ${pos.x} ${pos.y} ${pos.z}`);
        }
        lines.push('');

        // Export texture coordinates
        lines.push('# Texture coordinates');
        for (const vertex of lod.vertexBuffer.data) {
            if (vertex.uvs && vertex.uvs.length > 0) {
                const uv = vertex.uvs[0];
                lines.push(`vt ${uv.u} ${1.0 - uv.v}`); // Flip V coordinate
            }
        }
        lines.push('');

        // Export normals
        lines.push('# Normals');
        for (const vertex of lod.vertexBuffer.data) {
            const normal = vertex.normal;
            lines.push(`vn ${normal.x} ${normal.y} ${normal.z}`);
        }
        lines.push('');

        // Export materials and faces
        let vertexOffset = 1; // OBJ indices start at 1
        
        for (let sectionIndex = 0; sectionIndex < lod.sections.length; sectionIndex++) {
            const section = lod.sections[sectionIndex];
            
            lines.push(`# Section ${sectionIndex}`);
            if (mesh.materials && section.materialIndex < mesh.materials.length) {
                const material = mesh.materials[section.materialIndex];
                if (material && material.value) {
                    lines.push(`usemtl ${material.value.name || `Material_${section.materialIndex}`}`);
                }
            }
            
            // Export faces for this section
            const startIndex = section.firstIndex;
            const numTriangles = section.numTriangles;
            
            for (let i = 0; i < numTriangles; i++) {
                const i0 = lod.indices[startIndex + i * 3 + 0] + vertexOffset;
                const i1 = lod.indices[startIndex + i * 3 + 1] + vertexOffset;
                const i2 = lod.indices[startIndex + i * 3 + 2] + vertexOffset;
                
                lines.push(`f ${i0}/${i0}/${i0} ${i1}/${i1}/${i1} ${i2}/${i2}/${i2}`);
            }
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Convert USkeletalMesh to OBJ format
     */
    public static convertSkeletalMeshToOBJ(mesh: USkeletalMesh, lodIndex: number = 0): string {
        if (!mesh.lodRenderData || lodIndex >= mesh.lodRenderData.length) {
            throw new Error(`LOD ${lodIndex} not found in skeletal mesh`);
        }

        const lod = mesh.lodRenderData[lodIndex];
        const lines: string[] = [];
        
        // OBJ header
        lines.push('# Exported from unpak.js');
        lines.push('# Skeletal Mesh Export');
        lines.push('');

        // Export vertices
        lines.push('# Vertices');
        for (const vertex of lod.vertices) {
            const pos = vertex.position;
            lines.push(`v ${pos.x} ${pos.y} ${pos.z}`);
        }
        lines.push('');

        // Export texture coordinates
        lines.push('# Texture coordinates');
        for (const vertex of lod.vertices) {
            if (vertex.uvs && vertex.uvs.length > 0) {
                const uv = vertex.uvs[0];
                lines.push(`vt ${uv.u} ${1.0 - uv.v}`); // Flip V coordinate
            }
        }
        lines.push('');

        // Export normals
        lines.push('# Normals');
        for (const vertex of lod.vertices) {
            const normal = vertex.tangentZ; // Use tangent Z as normal
            lines.push(`vn ${normal.x} ${normal.y} ${normal.z}`);
        }
        lines.push('');

        // Export materials and faces
        let vertexOffset = 1; // OBJ indices start at 1
        
        for (let sectionIndex = 0; sectionIndex < lod.sections.length; sectionIndex++) {
            const section = lod.sections[sectionIndex];
            
            lines.push(`# Section ${sectionIndex}`);
            if (mesh.materials && section.materialIndex < mesh.materials.length) {
                const material = mesh.materials[section.materialIndex];
                if (material && material.value) {
                    lines.push(`usemtl ${material.value.name || `Material_${section.materialIndex}`}`);
                }
            }
            
            // Export faces for this section
            const startIndex = section.baseIndex;
            const numTriangles = section.numTriangles;
            
            for (let i = 0; i < numTriangles; i++) {
                const i0 = lod.indices[startIndex + i * 3 + 0] + vertexOffset;
                const i1 = lod.indices[startIndex + i * 3 + 1] + vertexOffset;
                const i2 = lod.indices[startIndex + i * 3 + 2] + vertexOffset;
                
                lines.push(`f ${i0}/${i0}/${i0} ${i1}/${i1}/${i1} ${i2}/${i2}/${i2}`);
            }
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Convert USkeletalMesh to glTF format (basic structure)
     */
    public static convertSkeletalMeshToGLTF(mesh: USkeletalMesh, lodIndex: number = 0): any {
        if (!mesh.lodRenderData || lodIndex >= mesh.lodRenderData.length) {
            throw new Error(`LOD ${lodIndex} not found in skeletal mesh`);
        }

        const lod = mesh.lodRenderData[lodIndex];
        
        // Basic glTF structure
        const gltf = {
            asset: {
                version: "2.0",
                generator: "unpak.js v2.0"
            },
            scene: 0,
            scenes: [
                {
                    nodes: [0]
                }
            ],
            nodes: [
                {
                    name: "SkeletalMesh",
                    mesh: 0,
                    skin: mesh.hasValidSkeleton() ? 0 : undefined
                }
            ],
            meshes: [
                {
                    name: "SkeletalMesh",
                    primitives: [] as any[]
                }
            ],
            buffers: [] as any[],
            bufferViews: [] as any[],
            accessors: [] as any[],
            materials: [] as any[]
        } as any;

        // Add skin data if skeleton exists
        if (mesh.hasValidSkeleton()) {
            gltf.skins = [
                {
                    joints: mesh.referenceSkeleton.refBoneInfo.map((_, index) => index + 1), // Node indices for bones
                    inverseBindMatrices: 0 // Accessor index for inverse bind matrices
                }
            ];

            // Add bone nodes
            for (let i = 0; i < mesh.referenceSkeleton.refBoneInfo.length; i++) {
                const bone = mesh.referenceSkeleton.refBoneInfo[i];
                const transform = mesh.referenceSkeleton.refBonePose[i];
                
                gltf.nodes.push({
                    name: bone.name,
                    translation: [transform.translation.x, transform.translation.y, transform.translation.z],
                    rotation: [transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w],
                    scale: [transform.scale3D.x, transform.scale3D.y, transform.scale3D.z],
                    children: mesh.referenceSkeleton.refBoneInfo
                        .map((child, childIndex) => child.parentIndex === i ? childIndex + 1 : -1)
                        .filter(index => index !== -1)
                });
            }
        }

        // Add mesh primitives
        for (const section of lod.sections) {
            const primitive = {
                attributes: {
                    POSITION: 0, // Will be filled with actual accessor indices
                    NORMAL: 1,
                    TEXCOORD_0: 2
                },
                indices: 3,
                material: section.materialIndex
            } as any;

            if (mesh.hasValidSkeleton()) {
                primitive.attributes.JOINTS_0 = 4;
                primitive.attributes.WEIGHTS_0 = 5;
            }

            gltf.meshes[0].primitives.push(primitive);
        }

        // Add materials
        for (let i = 0; i < mesh.materials.length; i++) {
            const material = mesh.materials[i];
            gltf.materials.push({
                name: material?.value?.name || `Material_${i}`,
                pbrMetallicRoughness: {
                    baseColorFactor: [1, 1, 1, 1],
                    metallicFactor: 0,
                    roughnessFactor: 1
                }
            });
        }

        return gltf;
    }

    /**
     * Extract mesh statistics for debugging
     */
    public static getMeshStatistics(mesh: USkeletalMesh | UStaticMesh): any {
        if (mesh instanceof USkeletalMesh) {
            return {
                type: "SkeletalMesh",
                lodCount: mesh.getNumLODs(),
                boneCount: mesh.getNumBones(),
                vertexCount: mesh.getTotalVertexCount(),
                triangleCount: mesh.getTotalTriangleCount(),
                materialCount: mesh.materials.length,
                hasValidSkeleton: mesh.hasValidSkeleton(),
                bounds: {
                    min: mesh.bounds.boxExtent,
                    max: mesh.bounds.boxExtent,
                    center: mesh.bounds.origin,
                    radius: mesh.bounds.sphereRadius
                }
            };
        } else if (mesh instanceof UStaticMesh) {
            return {
                type: "StaticMesh",
                lodCount: mesh.lods.length,
                vertexCount: mesh.lods.reduce((total, lod) => total + lod.numVertices, 0),
                triangleCount: mesh.lods.reduce((total, lod) => {
                    return total + lod.sections.reduce((sectionTotal, section) => {
                        return sectionTotal + section.numTriangles;
                    }, 0);
                }, 0),
                materialCount: mesh.materials.length,
                bounds: {
                    min: mesh.bounds.boxExtent,
                    max: mesh.bounds.boxExtent,
                    center: mesh.bounds.origin,
                    radius: mesh.bounds.sphereRadius
                }
            };
        }

        return { type: "Unknown" };
    }
}