import { 
    ASTCFormatInfo, 
    BC7FormatInfo, 
    ETC2FormatInfo, 
    requiresSpecialHandling
} from '../src/ue4/converters/textures/EnhancedFormats';

describe('Enhanced Texture Formats', () => {
    describe('ASTC Format Support', () => {
        test('should create ASTC format info correctly', () => {
            const astc4x4 = ASTCFormatInfo.PF_ASTC_4x4;
            expect(astc4x4.blockSizeX).toBe(4);
            expect(astc4x4.blockSizeY).toBe(4);
            expect(astc4x4.bytesPerBlock).toBe(16);
            expect(astc4x4.blockDimensions).toEqual([4, 4]);
            expect(astc4x4.pixelFormat).toBe('PF_ASTC_4x4');
        });

        test('should support various ASTC block sizes', () => {
            expect(ASTCFormatInfo.PF_ASTC_6x6.blockDimensions).toEqual([6, 6]);
            expect(ASTCFormatInfo.PF_ASTC_8x8.blockDimensions).toEqual([8, 8]);
            expect(ASTCFormatInfo.PF_ASTC_10x10.blockDimensions).toEqual([10, 10]);
            expect(ASTCFormatInfo.PF_ASTC_12x12.blockDimensions).toEqual([12, 12]);
        });

        test('should support 3D ASTC formats', () => {
            expect(ASTCFormatInfo.PF_ASTC_3x3x3.blockDimensions).toEqual([3, 3]);
            expect(ASTCFormatInfo.PF_ASTC_4x4x4.blockDimensions).toEqual([4, 4]);
            expect(ASTCFormatInfo.PF_ASTC_5x5x5.blockDimensions).toEqual([5, 5]);
        });
    });

    describe('BC7 Format Support', () => {
        test('should create BC7 format info correctly', () => {
            const bc7 = BC7FormatInfo.PF_BC7;
            expect(bc7.blockSizeX).toBe(4);
            expect(bc7.blockSizeY).toBe(4);
            expect(bc7.bytesPerBlock).toBe(16);
            expect(bc7.pixelFormat).toBe('PF_BC7');
            expect(bc7.float).toBe(false);
        });
    });

    describe('ETC2 Format Support', () => {
        test('should create ETC2 format variants correctly', () => {
            const etc2Rgb = ETC2FormatInfo.PF_ETC2_RGB;
            expect(etc2Rgb.blockSizeX).toBe(4);
            expect(etc2Rgb.blockSizeY).toBe(4);
            expect(etc2Rgb.bytesPerBlock).toBe(8);
            expect(etc2Rgb.variant).toBe('RGB');
            expect(etc2Rgb.pixelFormat).toBe('PF_ETC2_RGB');

            const etc2Rgba = ETC2FormatInfo.PF_ETC2_RGBA;
            expect(etc2Rgba.bytesPerBlock).toBe(16);
            expect(etc2Rgba.variant).toBe('RGBA');
        });

        test('should support all ETC2 variants', () => {
            expect(ETC2FormatInfo.PF_ETC2_RGB_A1.variant).toBe('RGB_A1');
            expect(ETC2FormatInfo.PF_ETC2_R11.variant).toBe('R11');
            expect(ETC2FormatInfo.PF_ETC2_RG11.variant).toBe('RG11');
        });
    });

    describe('Format Support Utilities', () => {
        test('should identify formats requiring special handling', () => {
            expect(requiresSpecialHandling('PF_ASTC_4x4')).toBe(true);
            expect(requiresSpecialHandling('PF_BC7')).toBe(true);
            expect(requiresSpecialHandling('PF_ETC2_RGB')).toBe(true);
            expect(requiresSpecialHandling('PF_BC6H')).toBe(true);
            expect(requiresSpecialHandling('PF_R8G8B8A8')).toBe(false);
        });
    });
});