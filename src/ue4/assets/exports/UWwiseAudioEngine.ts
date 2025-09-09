import { UObject } from "./UObject";
import { FAssetArchive } from "../reader/FAssetArchive";
import { Lazy } from "../../../util/Lazy";

/**
 * Wwise audio event data structure  
 * Based on CUE4Parse Wwise event system
 */
export class FWwiseEvent {
    public eventId: number = 0;
    public eventName: string = "";
    public eventGuid: string = "";
    public mediaIds: Array<number> = [];
    public externalSourceIds: Array<number> = [];
    public actionIds: Array<number> = [];
    public maxAttenuation: number = 0;
    public isStreamed: boolean = false;
    public maxDuration: number = 0;
    public minDuration: number = 0;
}

/**
 * Wwise sound bank data
 * Based on CUE4Parse Wwise bank system
 */
export class FWwiseSoundBank {
    public bankId: number = 0;
    public bankName: string = "";
    public bankGuid: string = "";
    public language: string = "";
    public isInitBank: boolean = false;
    public isUserBank: boolean = false;
    public mediaData: Uint8Array = new Uint8Array();
    public events: Array<FWwiseEvent> = [];
    public gameParameters: Array<any> = [];
    public triggers: Array<any> = [];
    public switches: Array<any> = [];
    public states: Array<any> = [];
}

/**
 * Audio streaming data structure
 * Based on CUE4Parse audio streaming system
 */
export class FAudioStreamingData {
    public streamedAudioChunks: Array<any> = [];
    public totalSize: number = 0;
    public chunkSize: number = 1024 * 64; // 64KB chunks
    public compressionFormat: string = "";
    public sampleRate: number = 44100;
    public numChannels: number = 2;
    public bitDepth: number = 16;
    public isLooping: boolean = false;
    public seekableChunks: Array<number> = [];
}

/**
 * Audio format conversion data
 * Based on FModel audio export capabilities
 */
export class FAudioFormatData {
    public originalFormat: string = "";
    public targetFormats: Array<string> = ["WAV", "OGG", "MP3"];
    public qualitySettings: Map<string, number> = new Map();
    public compressionSettings: Map<string, any> = new Map();
    public metadataPreserved: boolean = true;
    public artistInfo: string = "";
    public titleInfo: string = "";
    public albumInfo: string = "";
    public durationMs: number = 0;
}

/**
 * 3D Audio spatialization data
 * Based on CUE4Parse 3D audio system
 */
export class F3DAudioData {
    public bIs3D: boolean = false;
    public attenuationSettings: any | null = null;
    public spatializationAlgorithm: number = 0; // ESpatializationAlgorithm
    public bSpatializeWithSourceRadius: boolean = false;
    public sourceRadius: number = 0.0;
    public sourceDiameter: number = 0.0;
    public bUseConeAttenuation: boolean = false;
    public innerConeAngle: number = 360.0;
    public outerConeAngle: number = 360.0;
    public falloffDistance: number = 3600.0;
    public bAttenuateWithLPF: boolean = false;
    public lpfRadiusMin: number = 400.0;
    public lpfRadiusMax: number = 4000.0;
    public bEnableListenerFocus: boolean = false;
    public focusAzimuth: number = 30.0;
    public nonFocusAzimuth: number = 60.0;
    public focusDistanceScale: number = 1.0;
    public nonFocusDistanceScale: number = 1.0;
    public focusPriorityScale: number = 1.0;
    public nonFocusPriorityScale: number = 1.0;
    public focusVolumeScale: number = 1.0;
    public nonFocusVolumeScale: number = 1.0;
}

/**
 * Enhanced Wwise audio integration asset
 * Based on CUE4Parse Wwise system and FModel audio capabilities
 */
export class UWwiseAudioEngine extends UObject {
    // Core Wwise integration
    public wwiseProjectPath: string = "";
    public soundBanks: Array<FWwiseSoundBank> = [];
    public events: Array<FWwiseEvent> = [];
    public defaultLanguage: string = "English(US)";
    public supportedLanguages: Array<string> = [];
    public initBank: FWwiseSoundBank | null = null;
    
    // Audio streaming system
    public streamingSettings: FAudioStreamingData = new FAudioStreamingData();
    public bEnableAudioStreaming: boolean = true;
    public maxConcurrentStreams: number = 32;
    public audioMemoryPoolSize: number = 1024 * 1024 * 16; // 16MB
    public streamingLookahead: number = 1.0; // seconds
    
    // Format conversion and export
    public formatSettings: FAudioFormatData = new FAudioFormatData();
    public exportQuality: number = 0.8; // 0.0 to 1.0
    public preserveOriginalFormat: boolean = true;
    public enableBatchExport: boolean = true;
    public outputDirectory: string = "";
    
    // 3D Audio and spatialization
    public spatialAudioSettings: F3DAudioData = new F3DAudioData();
    public bEnable3DAudio: boolean = false;
    public defaultAttenuationAsset: Lazy<any> | null = null;
    public occlusionSettings: any | null = null;
    public reverbSettings: any | null = null;
    
    // Performance and optimization
    public audioThreadingMode: number = 0; // EAudioThreadingMode
    public maxVoices: number = 64;
    public callbackManagerThreadID: number = 0;
    public bUseBackgroundThreading: boolean = true;
    public audioLatency: number = 0.02; // 20ms
    
    // Platform-specific settings
    public platformSettings: Map<string, any> = new Map();
    public compressionOverrides: Map<string, string> = new Map();
    public qualityLevels: Array<string> = ["Low", "Medium", "High", "Epic"];
    
    // Event management
    public loadedEvents: Map<number, FWwiseEvent> = new Map();
    public playingEvents: Array<number> = [];
    public eventCallbacks: Map<number, Array<any>> = new Map();
    
    // Media management  
    public loadedMedia: Map<number, Uint8Array> = new Map();
    public streamingMedia: Map<number, FAudioStreamingData> = new Map();
    public preloadedBanks: Array<number> = [];

    /**
     * Get number of loaded sound banks
     */
    public getNumSoundBanks(): number {
        return this.soundBanks.length;
    }

    /**
     * Get number of registered events
     */
    public getNumEvents(): number {
        return this.events.length;
    }

    /**
     * Find event by ID
     */
    public findEvent(eventId: number): FWwiseEvent | null {
        return this.events.find(event => event.eventId === eventId) || null;
    }

    /**
     * Find event by name
     */
    public findEventByName(eventName: string): FWwiseEvent | null {
        return this.events.find(event => event.eventName === eventName) || null;
    }

    /**
     * Get sound bank by ID
     */
    public getSoundBank(bankId: number): FWwiseSoundBank | null {
        return this.soundBanks.find(bank => bank.bankId === bankId) || null;
    }

    /**
     * Check if language is supported
     */
    public isLanguageSupported(language: string): boolean {
        return this.supportedLanguages.includes(language);
    }

    /**
     * Get streaming capabilities
     */
    public supportsStreaming(): boolean {
        return this.bEnableAudioStreaming;
    }

    /**
     * Get 3D audio capabilities
     */
    public supports3DAudio(): boolean {
        return this.bEnable3DAudio;
    }

    /**
     * Get maximum concurrent voices
     */
    public getMaxVoices(): number {
        return this.maxVoices;
    }

    /**
     * Check if event is currently playing
     */
    public isEventPlaying(eventId: number): boolean {
        return this.playingEvents.includes(eventId);
    }

    /**
     * Get loaded media data
     */
    public getMediaData(mediaId: number): Uint8Array | null {
        return this.loadedMedia.get(mediaId) || null;
    }

    /**
     * Check if bank is preloaded
     */
    public isBankPreloaded(bankId: number): boolean {
        return this.preloadedBanks.includes(bankId);
    }

    /**
     * Get audio system statistics
     */
    public getAudioStatistics(): any {
        return {
            numSoundBanks: this.getNumSoundBanks(),
            numEvents: this.getNumEvents(),
            supportsStreaming: this.supportsStreaming(),
            supports3DAudio: this.supports3DAudio(),
            maxVoices: this.getMaxVoices(),
            currentlyPlaying: this.playingEvents.length,
            loadedMedia: this.loadedMedia.size,
            streamingMedia: this.streamingMedia.size,
            preloadedBanks: this.preloadedBanks.length,
            supportedLanguages: this.supportedLanguages.length,
            memoryPoolSize: this.audioMemoryPoolSize,
            audioLatency: this.audioLatency,
            maxConcurrentStreams: this.maxConcurrentStreams,
            exportFormats: this.formatSettings.targetFormats,
            qualityLevels: this.qualityLevels
        };
    }

    /**
     * Get supported export formats
     */
    public getSupportedFormats(): Array<string> {
        return this.formatSettings.targetFormats;
    }

    /**
     * Check if batch export is enabled
     */
    public supportsBatchExport(): boolean {
        return this.enableBatchExport;
    }

    /**
     * Get platform-specific settings
     */
    public getPlatformSettings(platform: string): any {
        return this.platformSettings.get(platform) || null;
    }

    /**
     * Get compression override for platform
     */
    public getCompressionOverride(platform: string): string | null {
        return this.compressionOverrides.get(platform) || null;
    }

    /**
     * Validate audio system configuration
     */
    public isValidConfiguration(): boolean {
        return this.initBank !== null && 
               this.soundBanks.length > 0 && 
               this.events.length > 0 &&
               this.supportedLanguages.length > 0;
    }
}