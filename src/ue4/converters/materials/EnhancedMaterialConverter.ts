import { UMaterialInterface } from "../../assets/exports/mats/UMaterialInterface";
import { UMaterialInstance } from "../../assets/exports/mats/UMaterialInstance";

/**
 * glTF PBR Material structure
 */
export interface IGLTFMaterial {
    name: string;
    pbrMetallicRoughness: {
        baseColorFactor: number[];
        baseColorTexture?: {
            index: number;
            texCoord?: number;
        };
        metallicFactor: number;
        roughnessFactor: number;
        metallicRoughnessTexture?: {
            index: number;
            texCoord?: number;
        };
    };
    normalTexture?: {
        index: number;
        texCoord?: number;
        scale?: number;
    };
    occlusionTexture?: {
        index: number;
        texCoord?: number;
        strength?: number;
    };
    emissiveTexture?: {
        index: number;
        texCoord?: number;
    };
    emissiveFactor: number[];
    alphaMode: "OPAQUE" | "MASK" | "BLEND";
    alphaCutoff?: number;
    doubleSided: boolean;
}

/**
 * Enhanced Material Converter
 * Supports multiple export formats including glTF PBR materials
 * Based on CUE4Parse material system and FModel export capabilities
 */
export class EnhancedMaterialConverter {
    
    /**
     * Convert UMaterial to glTF PBR material format
     */
    public static convertToGLTF(material: UMaterialInterface, textureIndices: Map<string, number> = new Map()): IGLTFMaterial {
        const gltfMaterial: IGLTFMaterial = {
            name: this.getObjectNameSafe(material),
            pbrMetallicRoughness: {
                baseColorFactor: [1.0, 1.0, 1.0, 1.0],
                metallicFactor: 0.0,
                roughnessFactor: 0.5
            },
            emissiveFactor: [0.0, 0.0, 0.0],
            alphaMode: "OPAQUE",
            doubleSided: false
        };

        try {
            // Extract material properties if it's a material instance
            if (material instanceof UMaterialInstance) {
                this.extractMaterialInstanceProperties(material, gltfMaterial, textureIndices);
            } else {
                this.extractBaseMaterialProperties(material, gltfMaterial, textureIndices);
            }
        } catch (error) {
            console.warn(`Failed to extract material properties: ${error}`);
        }

        return gltfMaterial;
    }

    /**
     * Extract properties from material instance
     */
    private static extractMaterialInstanceProperties(
        materialInstance: UMaterialInstance, 
        gltfMaterial: IGLTFMaterial, 
        textureIndices: Map<string, number>
    ): void {
        // Get scalar parameters - use actual property arrays
        const scalarParams = new Map<string, any>();
        if (materialInstance.ScalarParameterValues) {
            for (const param of materialInstance.ScalarParameterValues) {
                if (param.ParameterInfo && param.ParameterInfo.Name) {
                    scalarParams.set(param.ParameterInfo.Name.text || '', param.ParameterValue);
                }
            }
        }
        
        // Base color
        const baseColor = scalarParams.get("BaseColor") || scalarParams.get("Diffuse");
        if (typeof baseColor === 'number') {
            // Convert single float to RGB (assuming grayscale)
            gltfMaterial.pbrMetallicRoughness.baseColorFactor = [baseColor, baseColor, baseColor, 1.0];
        }

        // Metallic
        const metallic = scalarParams.get("Metallic");
        if (typeof metallic === 'number') {
            gltfMaterial.pbrMetallicRoughness.metallicFactor = Math.max(0, Math.min(1, metallic));
        }

        // Roughness
        const roughness = scalarParams.get("Roughness");
        if (typeof roughness === 'number') {
            gltfMaterial.pbrMetallicRoughness.roughnessFactor = Math.max(0, Math.min(1, roughness));
        }

        // Get texture parameters - use actual property arrays
        const textureParams = new Map<string, string>();
        if (materialInstance.TextureParameterValues) {
            for (const param of materialInstance.TextureParameterValues) {
                if (param.ParameterInfo && param.ParameterInfo.Name && param.ParameterValue) {
                    textureParams.set(param.ParameterInfo.Name.text || '', param.ParameterValue.toString());
                }
            }
        }
        
        // Base color texture
        const baseColorTexture = textureParams.get("BaseColorTexture") || textureParams.get("DiffuseTexture");
        if (baseColorTexture) {
            const textureIndex = textureIndices.get(baseColorTexture);
            if (textureIndex !== undefined) {
                gltfMaterial.pbrMetallicRoughness.baseColorTexture = {
                    index: textureIndex,
                    texCoord: 0
                };
            }
        }

        // Normal texture
        const normalTexture = textureParams.get("NormalTexture");
        if (normalTexture) {
            const textureIndex = textureIndices.get(normalTexture);
            if (textureIndex !== undefined) {
                gltfMaterial.normalTexture = {
                    index: textureIndex,
                    texCoord: 0,
                    scale: 1.0
                };
            }
        }
    }

    /**
     * Extract properties from base material
     */
    private static extractBaseMaterialProperties(
        material: UMaterialInterface,
        gltfMaterial: IGLTFMaterial,
        textureIndices: Map<string, number>
    ): void {
        // For base materials, we can only extract basic information
        // Most properties come from material instances
        
        // Set reasonable defaults for PBR
        gltfMaterial.pbrMetallicRoughness.metallicFactor = 0.0;
        gltfMaterial.pbrMetallicRoughness.roughnessFactor = 0.8;
        gltfMaterial.alphaMode = "OPAQUE";
        gltfMaterial.doubleSided = false;
    }

    /**
     * Convert material to Wavefront MTL format
     */
    public static convertToMTL(material: UMaterialInterface): string {
        const lines: string[] = [];
        const materialName = this.getObjectNameSafe(material);
        
        lines.push(`# Material exported from unpak.js`);
        lines.push(`newmtl ${materialName}`);
        
        // Default material properties
        lines.push('Ka 0.2 0.2 0.2'); // Ambient
        lines.push('Kd 0.8 0.8 0.8'); // Diffuse
        lines.push('Ks 0.1 0.1 0.1'); // Specular
        lines.push('Ns 10.0');        // Specular exponent
        lines.push('d 1.0');          // Dissolve (opacity)
        lines.push('illum 2');        // Illumination model
        
        if (material instanceof UMaterialInstance) {
            // Extract basic properties from actual UMaterialInstance
            if (material.ScalarParameterValues) {
                for (const param of material.ScalarParameterValues) {
                    if (param.ParameterInfo && param.ParameterInfo.Name) {
                        const paramName = param.ParameterInfo.Name.text || '';
                        if (paramName.toLowerCase().includes('opacity')) {
                            lines[lines.length - 2] = `d ${param.ParameterValue || 1.0}`;
                        }
                    }
                }
            }
            
            // Extract textures
            if (material.TextureParameterValues) {
                for (const param of material.TextureParameterValues) {
                    if (param.ParameterInfo && param.ParameterInfo.Name && param.ParameterValue) {
                        const paramName = param.ParameterInfo.Name.text || '';
                        const texturePath = param.ParameterValue.toString().replace(/\\/g, '/');
                        
                        if (paramName.toLowerCase().includes('diffuse') || paramName.toLowerCase().includes('basecolor')) {
                            lines.push(`map_Kd ${texturePath}`);
                        } else if (paramName.toLowerCase().includes('normal')) {
                            lines.push(`map_Bump ${texturePath}`);
                        }
                    }
                }
            }
        }
        
        lines.push('');
        return lines.join('\n');
    }

    /**
     * Generate material statistics
     */
    public static getMaterialStats(material: UMaterialInterface): {
        textureCount: number;
        parameterCount: number;
        isTranslucent: boolean;
        isEmissive: boolean;
        usesTangentSpaceNormal: boolean;
    } {
        let textureCount = 0;
        let parameterCount = 0;
        let isTranslucent = false;
        let isEmissive = false;
        let usesTangentSpaceNormal = false;

        if (material instanceof UMaterialInstance) {
            textureCount = material.TextureParameterValues?.length || 0;
            parameterCount = material.ScalarParameterValues?.length || 0;
            
            // Check for translucency and emissive properties
            if (material.ScalarParameterValues) {
                for (const param of material.ScalarParameterValues) {
                    if (param.ParameterInfo && param.ParameterInfo.Name) {
                        const paramName = param.ParameterInfo.Name.text || '';
                        if (paramName.toLowerCase().includes('blend') || paramName.toLowerCase().includes('translucent')) {
                            isTranslucent = param.ParameterValue > 0;
                        } else if (paramName.toLowerCase().includes('emissive')) {
                            isEmissive = param.ParameterValue > 0;
                        }
                    }
                }
            }
            
            // Check for normal mapping
            if (material.TextureParameterValues) {
                for (const param of material.TextureParameterValues) {
                    if (param.ParameterInfo && param.ParameterInfo.Name) {
                        const paramName = param.ParameterInfo.Name.text || '';
                        if (paramName.toLowerCase().includes('normal')) {
                            usesTangentSpaceNormal = true;
                            break;
                        }
                    }
                }
            }
        }

        return {
            textureCount,
            parameterCount,
            isTranslucent,
            isEmissive,
            usesTangentSpaceNormal
        };
    }

    /**
     * Validate glTF material for export
     */
    public static validateGLTFMaterial(material: IGLTFMaterial): string[] {
        const warnings: string[] = [];

        // Check base color factor
        if (material.pbrMetallicRoughness.baseColorFactor.some(c => c < 0 || c > 1)) {
            warnings.push("Base color factor values should be between 0 and 1");
        }

        // Check metallic factor
        if (material.pbrMetallicRoughness.metallicFactor < 0 || material.pbrMetallicRoughness.metallicFactor > 1) {
            warnings.push("Metallic factor should be between 0 and 1");
        }

        // Check roughness factor
        if (material.pbrMetallicRoughness.roughnessFactor < 0 || material.pbrMetallicRoughness.roughnessFactor > 1) {
            warnings.push("Roughness factor should be between 0 and 1");
        }

        // Check emissive factor
        if (material.emissiveFactor.some(c => c < 0)) {
            warnings.push("Emissive factor values should not be negative");
        }

        // Check alpha cutoff
        if (material.alphaMode === "MASK" && (!material.alphaCutoff || material.alphaCutoff < 0 || material.alphaCutoff > 1)) {
            warnings.push("Alpha cutoff should be between 0 and 1 for MASK alpha mode");
        }

        return warnings;
    }

    /**
     * Helper method to safely get object name
     */
    private static getObjectNameSafe(material: UMaterialInterface): string {
        try {
            return material.name || "Material";
        } catch {
            return "Material";
        }
    }
}