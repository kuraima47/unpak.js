import { FArchive } from "../../reader/FArchive";
import { FAssetRegistryTag } from "../../registry/objects/FAssetRegistryTag";

/**
 * Font character information
 */
export class FFontCharacter {
    public startU: number = 0;
    public startV: number = 0;
    public uSize: number = 0;
    public vSize: number = 0;
    public textureIndex: number = 0;
    public verticalOffset: number = 0;

    constructor(Ar?: any) {
        if (Ar && typeof Ar.readInt32 === 'function') {
            this.startU = Ar.readInt32();
            this.startV = Ar.readInt32();
            this.uSize = Ar.readInt32();
            this.vSize = Ar.readInt32();
            this.textureIndex = Ar.readUInt8();
            this.verticalOffset = Ar.readInt32();
        }
    }
}

/**
 * Font kerning information
 */
export class FFontKerning {
    public first: string = '';
    public second: string = '';
    public kerningAmount: number = 0;

    constructor(Ar?: any) {
        if (Ar && typeof Ar.readString === 'function') {
            this.first = Ar.readString();
            this.second = Ar.readString();
            this.kerningAmount = Ar.readInt32();
        }
    }
}

/**
 * Font Asset
 * Represents UE4/UE5 Font assets for text rendering
 * Based on CUE4Parse UFont implementation
 */
export class UFont {
    /** Font cache type (Offline, Runtime, etc.) */
    public fontCacheType: string = "Offline";
    
    /** Font characters mapping */
    public characters: Map<number, FFontCharacter> = new Map();
    
    /** Font textures used for rendering */
    public textures: string[] = [];
    
    /** Kerning information for character pairs */
    public kerning: FFontKerning[] = [];
    
    /** Font ascent (baseline to top) */
    public ascent: number = 0;
    
    /** Font descent (baseline to bottom) */  
    public descent: number = 0;
    
    /** Font line height */
    public leading: number = 0;
    
    /** Default character to use when glyph not found */
    public defaultCharacter: number = 32; // space
    
    /** Maximum character height */
    public maxCharHeight: number = 0;
    
    /** Scaling factor for font size */
    public scalingFactor: number = 1.0;
    
    /** Legacy font data for backwards compatibility */
    public legacyFontSize: number = 0;
    public legacyFontName: string = "";

    constructor(Ar: FArchive, exportType?: string) {
        this.deserializeFontData(Ar);
    }

    /**
     * Deserialize font specific data
     */
    private deserializeFontData(Ar: FArchive): void {
        try {
            // Read font cache type
            const cacheType = Ar.readString();
            if (cacheType) {
                this.fontCacheType = cacheType;
            }

            // Read font metrics
            this.ascent = Ar.readInt32();
            this.descent = Ar.readInt32();
            this.leading = Ar.readInt32();
            this.defaultCharacter = Ar.readInt32();
            this.maxCharHeight = Ar.readInt32();
            this.scalingFactor = Ar.readFloat32();

            // Read legacy font information
            this.legacyFontSize = Ar.readInt32();
            this.legacyFontName = Ar.readString();

            // Read font textures
            const numTextures = Ar.readInt32();
            for (let i = 0; i < numTextures; i++) {
                const texturePath = Ar.readString();
                if (texturePath) {
                    this.textures.push(texturePath);
                }
            }

            // Read character information
            const numCharacters = Ar.readInt32();
            for (let i = 0; i < numCharacters; i++) {
                const charCode = Ar.readInt32();
                const character = new FFontCharacter(Ar);
                this.characters.set(charCode, character);
            }

            // Read kerning information
            const numKerning = Ar.readInt32();
            for (let i = 0; i < numKerning; i++) {
                const kerningInfo = new FFontKerning(Ar);
                this.kerning.push(kerningInfo);
            }
        } catch (error) {
            // If parsing fails, continue with base object functionality
            console.warn(`Failed to parse font data: ${error}`);
        }
    }

    /**
     * Get character information for a specific character code
     */
    public getCharacter(charCode: number): FFontCharacter | undefined {
        return this.characters.get(charCode);
    }

    /**
     * Get all available character codes
     */
    public getCharacterCodes(): number[] {
        return Array.from(this.characters.keys()).sort((a, b) => a - b);
    }

    /**
     * Get font textures
     */
    public getTextures(): string[] {
        return [...this.textures];
    }

    /**
     * Get kerning amount for a character pair
     */
    public getKerning(first: string, second: string): number {
        const kerningInfo = this.kerning.find(k => k.first === first && k.second === second);
        return kerningInfo ? kerningInfo.kerningAmount : 0;
    }

    /**
     * Calculate text width for a given string
     */
    public calculateTextWidth(text: string): number {
        let width = 0;
        
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const character = this.getCharacter(charCode);
            
            if (character) {
                width += character.uSize;
                
                // Add kerning if not the last character
                if (i < text.length - 1) {
                    const nextChar = text.charAt(i + 1);
                    width += this.getKerning(text.charAt(i), nextChar);
                }
            }
        }
        
        return Math.round(width * this.scalingFactor);
    }

    /**
     * Get font height
     */
    public getFontHeight(): number {
        return Math.round((this.ascent + this.descent + this.leading) * this.scalingFactor);
    }

    /**
     * Check if character is available in this font
     */
    public hasCharacter(charCode: number): boolean {
        return this.characters.has(charCode);
    }

    /**
     * Get asset registry tags for fonts
     */
    public getAssetRegistryTags(): FAssetRegistryTag[] {
        const tags: FAssetRegistryTag[] = [];
        
        tags.push({
            key: "FontCacheType",
            value: this.fontCacheType
        } as FAssetRegistryTag);

        tags.push({
            key: "CharacterCount",
            value: this.characters.size.toString()
        } as FAssetRegistryTag);

        tags.push({
            key: "TextureCount",
            value: this.textures.length.toString()
        } as FAssetRegistryTag);

        tags.push({
            key: "FontHeight",
            value: this.getFontHeight().toString()
        } as FAssetRegistryTag);

        if (this.legacyFontName) {
            tags.push({
                key: "LegacyFontName",
                value: this.legacyFontName
            } as FAssetRegistryTag);
        }

        return tags;
    }

    public toString(): string {
        return `UFont(type=${this.fontCacheType}, chars=${this.characters.size}, textures=${this.textures.length}, height=${this.getFontHeight()})`;
    }
}