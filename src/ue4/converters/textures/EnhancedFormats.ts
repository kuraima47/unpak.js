/**
 * Enhanced texture format support for ASTC, BC7, ETC2 and other modern formats
 * This extends the basic texture support with more advanced compression formats
 */

/**
 * Base pixel format info class (simplified version to avoid import issues)
 */
export class PixelFormatInfo {
    public blockSizeX: number;
    public blockSizeY: number;
    public bytesPerBlock: number;
    public x360AlignX: number;
    public x360AlignY: number;
    public float: boolean;
    public pixelFormat: string;

    constructor(
        blockSizeX: number,
        blockSizeY: number,
        bytesPerBlock: number,
        x360AlignX: number,
        x360AlignY: number,
        float: boolean,
        pixelFormat: string
    ) {
        this.blockSizeX = blockSizeX;
        this.blockSizeY = blockSizeY;
        this.bytesPerBlock = bytesPerBlock;
        this.x360AlignX = x360AlignX;
        this.x360AlignY = x360AlignY;
        this.float = float;
        this.pixelFormat = pixelFormat;
    }
}

/**
 * ASTC (Adaptive Scalable Texture Compression) format support
 * Used primarily on mobile devices and modern GPUs
 */
export class ASTCFormatInfo extends PixelFormatInfo {
    /** ASTC block dimensions */
    public readonly blockDimensions: [number, number];

    constructor(blockX: number, blockY: number, bytesPerBlock: number) {
        super(blockX, blockY, bytesPerBlock, 0, 0, false, `PF_ASTC_${blockX}x${blockY}`);
        this.blockDimensions = [blockX, blockY];
    }

    // ASTC format variants
    static PF_ASTC_4x4 = new ASTCFormatInfo(4, 4, 16);
    static PF_ASTC_6x6 = new ASTCFormatInfo(6, 6, 16);
    static PF_ASTC_8x8 = new ASTCFormatInfo(8, 8, 16);
    static PF_ASTC_10x10 = new ASTCFormatInfo(10, 10, 16);
    static PF_ASTC_12x12 = new ASTCFormatInfo(12, 12, 16);
    static PF_ASTC_3x3x3 = new ASTCFormatInfo(3, 3, 16); // 3D ASTC
    static PF_ASTC_4x4x4 = new ASTCFormatInfo(4, 4, 16); // 3D ASTC
    static PF_ASTC_5x5x5 = new ASTCFormatInfo(5, 5, 16); // 3D ASTC
}

/**
 * BC7 (Block Compression 7) format support
 * High-quality compression format used in DirectX 11+
 */
export class BC7FormatInfo extends PixelFormatInfo {
    constructor() {
        super(4, 4, 16, 0, 0, false, "PF_BC7");
    }

    static PF_BC7 = new BC7FormatInfo();
}

/**
 * ETC2 (Ericsson Texture Compression 2) format support
 * Used primarily on mobile devices (OpenGL ES 3.0+)
 */
export class ETC2FormatInfo extends PixelFormatInfo {
    /** ETC2 variant type */
    public readonly variant: string;

    constructor(variant: string, bytesPerBlock: number) {
        super(4, 4, bytesPerBlock, 0, 0, false, `PF_ETC2_${variant}`);
        this.variant = variant;
    }

    // ETC2 format variants
    static PF_ETC2_RGB = new ETC2FormatInfo("RGB", 8);
    static PF_ETC2_RGBA = new ETC2FormatInfo("RGBA", 16);
    static PF_ETC2_RGB_A1 = new ETC2FormatInfo("RGB_A1", 8);
    static PF_ETC2_R11 = new ETC2FormatInfo("R11", 8);
    static PF_ETC2_RG11 = new ETC2FormatInfo("RG11", 16);
}

/**
 * Extended pixel format registry that includes modern formats
 */
export const ExtendedPixelFormatInfo = {
    // ASTC formats
    ...ASTCFormatInfo,
    
    // BC7 format
    ...BC7FormatInfo,
    
    // ETC2 formats
    ...ETC2FormatInfo,
    
    // Additional modern formats
    PF_BC6H: new PixelFormatInfo(4, 4, 16, 0, 0, true, "PF_BC6H"), // HDR compression
    PF_R16F: new PixelFormatInfo(1, 1, 2, 0, 0, true, "PF_R16F"), // 16-bit float
    PF_RG16F: new PixelFormatInfo(1, 1, 4, 0, 0, true, "PF_RG16F"), // 32-bit float (2x16)
    PF_RGBA16F: new PixelFormatInfo(1, 1, 8, 0, 0, true, "PF_RGBA16F"), // 64-bit float (4x16)
    PF_R32F: new PixelFormatInfo(1, 1, 4, 0, 0, true, "PF_R32F"), // 32-bit float
    PF_RG32F: new PixelFormatInfo(1, 1, 8, 0, 0, true, "PF_RG32F"), // 64-bit float (2x32)
    PF_RGBA32F: new PixelFormatInfo(1, 1, 16, 0, 0, true, "PF_RGBA32F"), // 128-bit float (4x32)
};

/**
 * Utility function to check if a format is supported for conversion
 * @param format Pixel format to check
 * @returns Whether the format is supported
 */
export function isFormatSupported(format: string): boolean {
    return format in ExtendedPixelFormatInfo;
}

/**
 * Get format information for enhanced formats
 * @param format Pixel format string
 * @returns Format information or null if not found
 */
export function getExtendedFormatInfo(format: string): PixelFormatInfo | null {
    return (ExtendedPixelFormatInfo as any)[format] || null;
}

/**
 * Check if a format requires special handling for decompression
 * @param format Pixel format string
 * @returns Whether special handling is needed
 */
export function requiresSpecialHandling(format: string): boolean {
    return format.startsWith('PF_ASTC_') || 
           format === 'PF_BC7' || 
           format.startsWith('PF_ETC2_') || 
           format === 'PF_BC6H';
}