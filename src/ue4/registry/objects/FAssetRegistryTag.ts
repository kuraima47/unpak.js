/**
 * Asset Registry Tag interface
 * Represents metadata tags associated with UE4/UE5 assets
 */
export interface FAssetRegistryTag {
    key: string;
    value: string;
}

/**
 * Asset Registry Tag implementation
 */
export class FAssetRegistryTagImpl implements FAssetRegistryTag {
    public key: string;
    public value: string;

    constructor(key: string, value: string) {
        this.key = key;
        this.value = value;
    }

    public toString(): string {
        return `${this.key}=${this.value}`;
    }
}