import { FAssetArchive } from "../../reader/FAssetArchive";
import { UMaterial } from "./UMaterial";
import { FName } from "../../../objects/uobject/FName";

/**
 * UDecalMaterial - Decal material support
 * Represents materials used for decals in UE4/UE5
 */
export class UDecalMaterial extends UMaterial {
    /** 
     * Decal blend mode
     * @type {number}
     * @public
     */
    decalBlendMode: number = 0;

    /** 
     * Sort priority for decal rendering
     * @type {number}
     * @public
     */
    sortPriority: number = 0;

    /** 
     * Decal size in world units
     * @type {[number, number, number]}
     * @public
     */
    decalSize: [number, number, number] = [128.0, 128.0, 128.0];

    /** 
     * Whether the decal receives DBuffer (dynamic buffer) data
     * @type {boolean}
     * @public
     */
    dbufferBlendMode: boolean = false;

    /**
     * Deserializes decal material properties
     * @param {FAssetArchive} Ar Reader to use
     * @param {number} validPos Valid position of Reader
     * @returns {void}
     * @public
     */
    deserialize(Ar: FAssetArchive, validPos: number) {
        super.deserialize(Ar, validPos);
        // Decal-specific properties would be parsed from the material properties
    }

    /**
     * Returns JSON representation
     * @returns {any} JSON object
     * @public
     */
    toJson(): any {
        return {
            ...super.toJson(),
            decalBlendMode: this.decalBlendMode,
            sortPriority: this.sortPriority,
            decalSize: this.decalSize,
            dbufferBlendMode: this.dbufferBlendMode
        };
    }
}

/**
 * UPostProcessMaterial - Post-process material support
 * Represents materials used for post-processing effects in UE4/UE5
 */
export class UPostProcessMaterial extends UMaterial {
    /** 
     * Blendable location in the post-process pipeline
     * @type {number}
     * @public
     */
    blendableLocation: number = 0;

    /** 
     * Blendable priority
     * @type {number}
     * @public
     */
    blendablePriority: number = 0;

    /** 
     * Whether this is a output material
     * @type {boolean}
     * @public
     */
    isBlendable: boolean = true;

    /** 
     * Post-process domain (e.g., before translucency, after tone mapping)
     * @type {FName}
     * @public
     */
    postProcessDomain: FName = new FName();

    /**
     * Deserializes post-process material properties
     * @param {FAssetArchive} Ar Reader to use
     * @param {number} validPos Valid position of Reader
     * @returns {void}
     * @public
     */
    deserialize(Ar: FAssetArchive, validPos: number) {
        super.deserialize(Ar, validPos);
        // Post-process specific properties would be parsed from the material properties
    }

    /**
     * Returns JSON representation
     * @returns {any} JSON object
     * @public
     */
    toJson(): any {
        return {
            ...super.toJson(),
            blendableLocation: this.blendableLocation,
            blendablePriority: this.blendablePriority,
            isBlendable: this.isBlendable,
            postProcessDomain: this.postProcessDomain.text
        };
    }
}