/**
 * Phase 5: Game-Specific Support - Fall Guys
 * 
 * Support for Fall Guys specific assets including costumes, levels, and gameplay elements
 */

import { UObject } from '../../assets/exports/UObject';
import { FPackageIndex } from '../../objects/uobject/ObjectResource';
import { FLinearColor } from '../../objects/core/math/FLinearColor';

/**
 * Fall Guys costume piece
 */
export class FGCostumePiece extends UObject {
    /** Costume piece type (upper, lower, color, pattern, face, celebration) */
    pieceType?: string;
    
    /** Costume piece name */
    pieceName?: string;
    
    /** Rarity level */
    rarity?: string;
    
    /** Season association */
    season?: number;
    
    /** Costume mesh */
    costumeMesh?: FPackageIndex;
    
    /** Materials and textures */
    materials?: FPackageIndex[];
    
    /** Animation overrides */
    animationOverrides?: FPackageIndex[];
    
    /** Color variations */
    colorVariations?: FGColorVariation[];
    
    /** Pattern overlays */
    patternOverlays?: FPackageIndex[];
    
    /** Special effects */
    specialEffects?: FGSpecialEffect[];
    
    /** Customization restrictions */
    restrictions?: {
        genderRestricted?: boolean;
        exclusiveWith?: string[];
        requiresOwnership?: string[];
    };
}

/**
 * Fall Guys color variation
 */
export interface FGColorVariation {
    /** Variation name */
    name: string;
    
    /** Primary color */
    primaryColor: FLinearColor;
    
    /** Secondary color */
    secondaryColor?: FLinearColor;
    
    /** Material parameter overrides */
    materialOverrides?: Record<string, any>;
    
    /** Unlock conditions */
    unlockConditions?: string[];
}

/**
 * Fall Guys special effect
 */
export interface FGSpecialEffect {
    /** Effect type (particle, audio, animation) */
    effectType: string;
    
    /** Effect asset */
    effectAsset: FPackageIndex;
    
    /** Trigger conditions */
    triggers: string[];
    
    /** Effect parameters */
    parameters?: Record<string, any>;
    
    /** Duration in seconds */
    duration?: number;
}

/**
 * Fall Guys level/round configuration
 */
export class FGLevel extends UObject {
    /** Level name */
    levelName?: string;
    
    /** Level type (race, survival, team, final) */
    levelType?: string;
    
    /** Season introduced */
    seasonIntroduced?: number;
    
    /** Level mesh and geometry */
    levelMesh?: FPackageIndex;
    
    /** Collision meshes */
    collisionMeshes?: FPackageIndex[];
    
    /** Obstacle configurations */
    obstacles?: FGObstacle[];
    
    /** Spawn points */
    spawnPoints?: FGSpawnPoint[];
    
    /** Checkpoint system */
    checkpoints?: FGCheckpoint[];
    
    /** Win conditions */
    winConditions?: FGWinCondition;
    
    /** Physics properties */
    physicsProperties?: FGLevelPhysics;
    
    /** Audio configuration */
    audioConfig?: FGLevelAudio;
    
    /** Environmental hazards */
    hazards?: FGHazard[];
    
    /** Interactive elements */
    interactables?: FGInteractable[];
}

/**
 * Fall Guys obstacle configuration
 */
export interface FGObstacle {
    /** Obstacle type */
    type: string;
    
    /** Obstacle mesh */
    mesh: FPackageIndex;
    
    /** World position */
    position: [number, number, number];
    
    /** Rotation */
    rotation: [number, number, number];
    
    /** Scale */
    scale: [number, number, number];
    
    /** Movement pattern */
    movementPattern?: {
        type: string;
        speed: number;
        path?: [number, number, number][];
        rotationSpeed?: number;
    };
    
    /** Collision properties */
    collision: {
        type: string;
        pushForce?: number;
        grabable?: boolean;
        deadly?: boolean;
    };
    
    /** Visual effects */
    effects?: FPackageIndex[];
    
    /** Audio cues */
    audioCues?: FPackageIndex[];
}

/**
 * Fall Guys spawn point
 */
export interface FGSpawnPoint {
    /** World position */
    position: [number, number, number];
    
    /** Facing direction */
    rotation: [number, number, number];
    
    /** Spawn group (for team games) */
    spawnGroup?: number;
    
    /** Priority */
    priority: number;
    
    /** Safe zone radius */
    safeZoneRadius?: number;
}

/**
 * Fall Guys checkpoint
 */
export interface FGCheckpoint {
    /** Checkpoint ID */
    checkpointId: string;
    
    /** Trigger volume */
    triggerVolume: {
        center: [number, number, number];
        extents: [number, number, number];
    };
    
    /** Respawn point */
    respawnPoint: {
        position: [number, number, number];
        rotation: [number, number, number];
    };
    
    /** Checkpoint order */
    order: number;
    
    /** Visual indicators */
    visualIndicators?: FPackageIndex[];
    
    /** Audio feedback */
    audioFeedback?: FPackageIndex[];
}

/**
 * Fall Guys win condition
 */
export interface FGWinCondition {
    /** Condition type (reach_finish, survive_time, team_score, elimination) */
    type: string;
    
    /** Target value (time, score, players remaining) */
    targetValue?: number;
    
    /** Maximum players advancing */
    maxAdvancing?: number;
    
    /** Minimum players advancing */
    minAdvancing?: number;
    
    /** Time limit in seconds */
    timeLimit?: number;
    
    /** Team-based scoring */
    teamScoring?: {
        enabled: boolean;
        scorePerAction?: Record<string, number>;
        bonusMultipliers?: Record<string, number>;
    };
}

/**
 * Fall Guys level physics
 */
export interface FGLevelPhysics {
    /** Gravity multiplier */
    gravityMultiplier: number;
    
    /** Player movement properties */
    playerMovement: {
        walkSpeed: number;
        runSpeed: number;
        jumpHeight: number;
        diveDistance: number;
        grabReach: number;
        grabStrength: number;
    };
    
    /** Surface friction values */
    surfaceFriction: Record<string, number>;
    
    /** Wind effects */
    windEffects?: {
        enabled: boolean;
        strength: number;
        direction: [number, number, number];
        variability: number;
    };
    
    /** Conveyor belt speeds */
    conveyorSpeeds?: Record<string, number>;
}

/**
 * Fall Guys level audio
 */
export interface FGLevelAudio {
    /** Background music */
    backgroundMusic?: FPackageIndex;
    
    /** Ambient sounds */
    ambientSounds?: FPackageIndex[];
    
    /** Crowd reactions */
    crowdReactions?: FPackageIndex[];
    
    /** Obstacle sounds */
    obstacleSounds?: Record<string, FPackageIndex>;
    
    /** Victory/defeat stingers */
    stingers?: {
        victory?: FPackageIndex;
        defeat?: FPackageIndex;
        qualification?: FPackageIndex;
    };
    
    /** Audio reverb settings */
    reverbSettings?: {
        presetName: string;
        customSettings?: Record<string, number>;
    };
}

/**
 * Fall Guys environmental hazard
 */
export interface FGHazard {
    /** Hazard type */
    type: string;
    
    /** Hazard mesh/effect */
    asset: FPackageIndex;
    
    /** Trigger area */
    triggerArea: {
        shape: string;
        center: [number, number, number];
        dimensions: [number, number, number];
    };
    
    /** Damage/effect */
    effect: {
        type: string;
        strength: number;
        duration?: number;
    };
    
    /** Warning system */
    warnings?: {
        visualWarning?: FPackageIndex;
        audioWarning?: FPackageIndex;
        warningTime?: number;
    };
}

/**
 * Fall Guys interactive element
 */
export interface FGInteractable {
    /** Element type */
    type: string;
    
    /** Interactive mesh */
    mesh: FPackageIndex;
    
    /** World position */
    position: [number, number, number];
    
    /** Interaction radius */
    interactionRadius: number;
    
    /** Interaction type (grab, push, activate) */
    interactionType: string;
    
    /** Effect of interaction */
    interactionEffect: {
        type: string;
        parameters: Record<string, any>;
    };
    
    /** Cooldown time */
    cooldownTime?: number;
    
    /** Visual feedback */
    feedback?: {
        highlightMaterial?: FPackageIndex;
        activationEffect?: FPackageIndex;
        audioFeedback?: FPackageIndex;
    };
}

/**
 * Fall Guys emote/celebration
 */
export class FGEmote extends UObject {
    /** Emote name */
    emoteName?: string;
    
    /** Emote type (victory, taunt, dance, gesture) */
    emoteType?: string;
    
    /** Animation sequence */
    animationSequence?: FPackageIndex;
    
    /** Duration in seconds */
    duration?: number;
    
    /** Looping behavior */
    looping?: boolean;
    
    /** Sound effects */
    soundEffects?: FPackageIndex[];
    
    /** Particle effects */
    particleEffects?: FPackageIndex[];
    
    /** Unlockable properties */
    unlockProperties?: {
        rarity: string;
        unlockMethod: string;
        seasonExclusive?: boolean;
        eventExclusive?: boolean;
    };
    
    /** Emote categories */
    categories?: string[];
}

/**
 * Fall Guys utility functions
 */
export class FallGuysUtils {
    /**
     * Calculate costume piece rarity score
     */
    static calculateRarityScore(piece: FGCostumePiece): number {
        const rarityScores: Record<string, number> = {
            'common': 1,
            'uncommon': 2,
            'rare': 3,
            'epic': 4,
            'legendary': 5,
            'special': 6
        };
        
        return rarityScores[piece.rarity || 'common'] || 1;
    }
    
    /**
     * Get level difficulty rating
     */
    static getLevelDifficulty(level: FGLevel): number {
        // Calculate difficulty based on obstacles, hazards, etc.
        let difficulty = 1;
        
        if (level.obstacles) {
            difficulty += level.obstacles.length * 0.1;
        }
        
        if (level.hazards) {
            difficulty += level.hazards.length * 0.2;
        }
        
        if (level.winConditions?.timeLimit) {
            difficulty += (300 - level.winConditions.timeLimit) / 100;
        }
        
        return Math.min(10, Math.max(1, difficulty));
    }
    
    /**
     * Check costume piece compatibility
     */
    static isCompatible(piece1: FGCostumePiece, piece2: FGCostumePiece): boolean {
        if (!piece1.restrictions || !piece2.restrictions) {
            return true;
        }
        
        // Check exclusivity rules
        if (piece1.restrictions.exclusiveWith?.includes(piece2.pieceName || '')) {
            return false;
        }
        
        if (piece2.restrictions.exclusiveWith?.includes(piece1.pieceName || '')) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get season theme colors
     */
    static getSeasonTheme(season: number): { primary: FLinearColor; secondary: FLinearColor } {
        // Return theme colors for each season
        const themes: Record<number, { primary: FLinearColor; secondary: FLinearColor }> = {
            1: { 
                primary: new FLinearColor(1.0, 0.6, 0.0, 1.0), // Orange
                secondary: new FLinearColor(0.0, 0.7, 1.0, 1.0) // Blue
            },
            2: {
                primary: new FLinearColor(0.9, 0.1, 0.5, 1.0), // Pink
                secondary: new FLinearColor(0.2, 0.8, 0.3, 1.0) // Green
            }
            // Add more seasons as needed
        };
        
        return themes[season] || themes[1];
    }
}