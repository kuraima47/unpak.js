import { UObject } from "../UObject";
import { FAssetArchive } from "../../reader/FAssetArchive";

/**
 * Base Material class
 * Based on CUE4Parse UMaterial implementation
 */
export class UMaterial extends UObject {
    constructor(properties: any[] = []) {
        super(properties);
    }

    /**
     * Placeholder material implementation
     */
    public getMaterialType(): string {
        return "Material";
    }
}