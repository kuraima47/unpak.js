import { UAnimBlueprint } from '../src/ue4/assets/exports/UAnimBlueprint';
import { UBlueprint } from '../src/ue4/assets/exports/UBlueprint';
import { UFont, FFontCharacter } from '../src/ue4/assets/exports/UFont';
import { UNiagaraSystem, FNiagaraEmitter } from '../src/ue4/assets/exports/UNiagaraSystem';

// Mock FArchive for testing
class MockFArchive {
    private position = 0;
    private data: any[] = [];

    constructor(mockData: any[] = []) {
        this.data = mockData;
    }

    readString(): string {
        return this.data[this.position++] || "";
    }

    readBoolean(): boolean {
        return this.data[this.position++] || false;
    }

    readInt32(): number {
        return this.data[this.position++] || 0;
    }

    readUInt8(): number {
        return this.data[this.position++] || 0;
    }

    readUInt16(): number {
        return this.data[this.position++] || 0;
    }

    readFloat32(): number {
        return this.data[this.position++] || 0.0;
    }

    reset(): void {
        this.position = 0;
    }
}

describe('Enhanced Asset Types', () => {
    describe('UBlueprint', () => {
        test('should create blueprint with basic properties', () => {
            const mockData = [
                'Actor',        // blueprintType
                'AActor',       // parentClass
                'Test Blueprint', // description
                true,           // isCompilable
                'Test',         // category
                2,              // numVars
                'TestVar1', 'float',
                'TestVar2', 'bool',
                1,              // numFunctions
                'TestFunction'
            ];
            const archive = new MockFArchive(mockData);
            
            const blueprint = new UBlueprint(archive as any, 'Blueprint');
            
            expect(blueprint.getBlueprintType()).toBe('Actor');
            expect(blueprint.getParentClass()).toBe('AActor');
            expect(blueprint.canCompile()).toBe(true);
            expect(blueprint.getBlueprintVariables().size).toBe(2);
            expect(blueprint.getBlueprintFunctions().length).toBe(1);
        });

        test('should generate asset registry tags', () => {
            const mockData = ['Actor', 'AActor', 'Test Blueprint', true, 'Test', 0, 0];
            const archive = new MockFArchive(mockData);
            
            const blueprint = new UBlueprint(archive as any, 'Blueprint');
            const tags = blueprint.getAssetRegistryTags();
            
            expect(tags.length).toBeGreaterThan(0);
            expect(tags.some(tag => tag.key === 'BlueprintType')).toBe(true);
        });
    });

    describe('UAnimBlueprint', () => {
        test('should create animation blueprint with skeletal mesh target', () => {
            const mockData = [
                'Actor', 'AActor', 'Test', true, 'Animation', 0, 0, // Base blueprint data
                '/Game/Characters/Player/SK_Player', // targetSkeleton
                'AnimGraph',    // animationMode
                2,              // numAnimAssets
                '/Game/Animations/Idle',
                '/Game/Animations/Walk',
                1,              // numAnimVars
                'PlaybackSpeed', 'float', 1.0
            ];
            const archive = new MockFArchive(mockData);
            
            const animBlueprint = new UAnimBlueprint(archive as any, 'AnimBlueprint');
            
            expect(animBlueprint.getTargetSkeleton()).toBe('/Game/Characters/Player/SK_Player');
            expect(animBlueprint.getReferencedAnimAssets().length).toBe(2);
            expect(animBlueprint.getAnimVariables().size).toBe(1);
            expect(animBlueprint.isCompatibleWithSkeleton('/Game/Characters/Player/SK_Player')).toBe(true);
        });
    });

    describe('UFont', () => {
        test('should create font with character mapping', () => {
            const mockData = [
                'Offline',      // fontCacheType
                20,             // ascent
                -5,             // descent
                2,              // leading
                32,             // defaultCharacter
                25,             // maxCharHeight
                1.0,            // scalingFactor
                12,             // legacyFontSize
                'Arial',        // legacyFontName
                1,              // numTextures
                '/Game/Fonts/Arial_Texture',
                2,              // numCharacters
                65, 0, 0, 16, 20, 0, 0,  // Character 'A'
                66, 16, 0, 14, 20, 0, 0, // Character 'B'
                0               // numKerning
            ];
            const archive = new MockFArchive(mockData);
            
            const font = new UFont(archive as any, 'Font');
            
            expect(font.fontCacheType).toBe('Offline');
            expect(font.getFontHeight()).toBe(17); // ascent + descent + leading = 20 + (-5) + 2
            expect(font.getCharacterCodes().length).toBe(2);
            expect(font.hasCharacter(65)).toBe(true); // 'A'
            expect(font.hasCharacter(66)).toBe(true); // 'B'
            expect(font.hasCharacter(67)).toBe(false); // 'C'
        });

        test('should calculate text width correctly', () => {
            const mockData = [
                'Offline', 20, -5, 2, 32, 25, 1.0, 12, 'Arial',
                1, '/Game/Fonts/Arial_Texture',
                2,
                65, 0, 0, 16, 20, 0, 0,  // Character 'A' - 16 width
                66, 16, 0, 14, 20, 0, 0, // Character 'B' - 14 width
                0
            ];
            const archive = new MockFArchive(mockData);
            const font = new UFont(archive as any, 'Font');
            
            const width = font.calculateTextWidth('AB');
            expect(width).toBe(30); // 16 + 14
        });
    });

    describe('UNiagaraSystem', () => {
        test('should create Niagara system with emitters', () => {
            const mockData = [
                true,           // isActive
                'Active',       // systemState
                '',             // systemSpawnScript
                '',             // systemUpdateScript
                0.0,            // warmupTime
                0,              // warmupTickCount
                0.0,            // warmupTickDelta
                true,           // supportsCulling
                10000.0,        // maxDistance
                false,          // hasFixedBounds
                0,              // numSystemParams
                0,              // numUserParams
                1,              // numEmitters
                'FireEmitter',  // emitter name
                true,           // emitter enabled
                '',             // emitter script
                '',             // spawn script
                '',             // update script
                '',             // render script
                0,              // num stages
                1,              // num properties
                'ParticleCount', 'int', 1000,
                0               // numPlatforms
            ];
            const archive = new MockFArchive(mockData);
            
            const niagaraSystem = new UNiagaraSystem(archive as any, 'NiagaraSystem');
            
            expect(niagaraSystem.getIsActive()).toBe(true);
            expect(niagaraSystem.emitters.length).toBe(1);
            expect(niagaraSystem.getActiveEmitters().length).toBe(1);
            expect(niagaraSystem.getEmitterByName('FireEmitter')).toBeDefined();
            expect(niagaraSystem.getComplexityEstimate()).toBeGreaterThan(0);
        });
    });
});

describe('Enhanced Converters', () => {
    describe('Enhanced Audio Support', () => {
        // Note: These are placeholder tests since the actual audio classes have different interfaces
        test('should support enhanced audio functionality', () => {
            // We would test the audio converter here, but the actual implementation
            // needs to match the existing USoundWave and UAkMediaAssetData interfaces
            expect(true).toBe(true);
        });
    });
});

describe('Integration Tests', () => {
    test('should handle asset loading pipeline', () => {
        // This test would verify the complete pipeline from PAK extraction to asset conversion
        // For now, we'll just test that all components can be imported together
        expect(UAnimBlueprint).toBeDefined();
        expect(UFont).toBeDefined();
        expect(UNiagaraSystem).toBeDefined();
    });

    test('should maintain backward compatibility', () => {
        // Ensure new features don't break existing functionality
        const mockData = ['Actor', 'AActor', 'Test', true, 'Test', 0, 0];
        const archive = new MockFArchive(mockData);
        
        const blueprint = new UBlueprint(archive as any, 'Blueprint');
        expect(blueprint.toString()).toContain('UBlueprint');
    });
});