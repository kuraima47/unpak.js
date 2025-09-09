import { UAkMediaAssetData } from "../../assets/exports/UAkMediaAssetData";
import { USoundWave } from "../../assets/exports/USoundWave";
import { UWwiseAudioEngine } from "../../assets/exports/UWwiseAudioEngine";

/**
 * Audio format information
 */
export interface IAudioFormat {
    format: 'WAV' | 'OGG' | 'MP3' | 'FLAC' | 'AAC';
    sampleRate: number;
    channels: number;
    bitDepth: number;
    duration: number;
    bitrate?: number;
}

/**
 * 3D Audio properties
 */
export interface I3DAudioProperties {
    minDistance: number;
    maxDistance: number;
    rolloffFactor: number;
    dopplerFactor: number;
    spatializationMode: 'None' | 'Binaural' | 'Object' | 'Ambisonics';
    enableLowPassFilter: boolean;
    enableHighPassFilter: boolean;
    enableDistanceAttenuation: boolean;
}

/**
 * Enhanced Wwise Audio Converter
 * Comprehensive audio processing and conversion for UE4/UE5 Wwise integration
 * Based on CUE4Parse audio system and FModel audio export capabilities
 */
export class EnhancedWwiseConverter {
    
    /**
     * Convert Wwise media asset to WAV format
     */
    public static convertWwiseToWAV(asset: UAkMediaAssetData): ArrayBuffer | null {
        try {
            // Get the raw audio data
            const audioData = asset.getRawAudioData();
            if (!audioData) {
                console.warn("No audio data found in Wwise asset");
                return null;
            }

            // Get audio format information
            const formatInfo = this.getWwiseAudioFormat(asset);
            
            // Create WAV header
            const wavHeader = this.createWAVHeader(audioData.byteLength, formatInfo);
            
            // Combine header and audio data
            const wavBuffer = new ArrayBuffer(wavHeader.byteLength + audioData.byteLength);
            const wavView = new Uint8Array(wavBuffer);
            
            wavView.set(new Uint8Array(wavHeader), 0);
            wavView.set(new Uint8Array(audioData), wavHeader.byteLength);
            
            return wavBuffer;
        } catch (error) {
            console.error(`Failed to convert Wwise asset to WAV: ${error}`);
            return null;
        }
    }

    /**
     * Convert USoundWave to multiple formats
     */
    public static convertSoundWave(soundWave: USoundWave, targetFormat: 'WAV' | 'OGG' = 'WAV'): ArrayBuffer | null {
        try {
            const audioData = soundWave.getRawAudioData();
            if (!audioData) {
                console.warn("No audio data found in SoundWave");
                return null;
            }

            const formatInfo: IAudioFormat = {
                format: targetFormat,
                sampleRate: soundWave.getSampleRate(),
                channels: soundWave.getNumChannels(),
                bitDepth: 16, // Default to 16-bit
                duration: soundWave.getDuration()
            };

            if (targetFormat === 'WAV') {
                const wavHeader = this.createWAVHeader(audioData.byteLength, formatInfo);
                const wavBuffer = new ArrayBuffer(wavHeader.byteLength + audioData.byteLength);
                const wavView = new Uint8Array(wavBuffer);
                
                wavView.set(new Uint8Array(wavHeader), 0);
                wavView.set(new Uint8Array(audioData), wavHeader.byteLength);
                
                return wavBuffer;
            } else if (targetFormat === 'OGG') {
                // For OGG, we would need an OGG encoder
                // This is a placeholder for OGG conversion
                console.warn("OGG conversion not implemented yet");
                return audioData;
            }

            return null;
        } catch (error) {
            console.error(`Failed to convert SoundWave: ${error}`);
            return null;
        }
    }

    /**
     * Extract 3D audio properties from Wwise engine
     */
    public static extract3DAudioProperties(wwiseEngine: UWwiseAudioEngine): I3DAudioProperties {
        const defaultProperties: I3DAudioProperties = {
            minDistance: 100.0,
            maxDistance: 10000.0,
            rolloffFactor: 1.0,
            dopplerFactor: 1.0,
            spatializationMode: 'Object',
            enableLowPassFilter: true,
            enableHighPassFilter: false,
            enableDistanceAttenuation: true
        };

        try {
            const audioSettings = wwiseEngine.getAudioSettings();
            
            // Extract distance settings
            const minDist = audioSettings.get('MinDistance');
            if (typeof minDist === 'number') {
                defaultProperties.minDistance = minDist;
            }

            const maxDist = audioSettings.get('MaxDistance');
            if (typeof maxDist === 'number') {
                defaultProperties.maxDistance = maxDist;
            }

            // Extract rolloff settings
            const rolloff = audioSettings.get('RolloffFactor');
            if (typeof rolloff === 'number') {
                defaultProperties.rolloffFactor = rolloff;
            }

            // Extract Doppler settings
            const doppler = audioSettings.get('DopplerFactor');
            if (typeof doppler === 'number') {
                defaultProperties.dopplerFactor = doppler;
            }

            // Extract spatialization mode
            const spatMode = audioSettings.get('SpatializationMode');
            if (typeof spatMode === 'string') {
                switch (spatMode.toLowerCase()) {
                    case 'binaural':
                        defaultProperties.spatializationMode = 'Binaural';
                        break;
                    case 'ambisonics':
                        defaultProperties.spatializationMode = 'Ambisonics';
                        break;
                    case 'object':
                        defaultProperties.spatializationMode = 'Object';
                        break;
                    default:
                        defaultProperties.spatializationMode = 'None';
                        break;
                }
            }

            // Extract filter settings
            const lowPassEnabled = audioSettings.get('EnableLowPassFilter');
            if (typeof lowPassEnabled === 'boolean') {
                defaultProperties.enableLowPassFilter = lowPassEnabled;
            }

            const highPassEnabled = audioSettings.get('EnableHighPassFilter');
            if (typeof highPassEnabled === 'boolean') {
                defaultProperties.enableHighPassFilter = highPassEnabled;
            }

            const distanceAttenuationEnabled = audioSettings.get('EnableDistanceAttenuation');
            if (typeof distanceAttenuationEnabled === 'boolean') {
                defaultProperties.enableDistanceAttenuation = distanceAttenuationEnabled;
            }

        } catch (error) {
            console.warn(`Failed to extract 3D audio properties: ${error}`);
        }

        return defaultProperties;
    }

    /**
     * Analyze audio asset for quality metrics
     */
    public static analyzeAudioQuality(asset: UAkMediaAssetData | USoundWave): {
        quality: 'Low' | 'Medium' | 'High' | 'Lossless';
        estimatedSize: number;
        compressionRatio: number;
        sampleRate: number;
        channels: number;
        bitDepth: number;
        duration: number;
    } {
        let sampleRate = 44100;
        let channels = 2;
        let bitDepth = 16;
        let duration = 0;
        let dataSize = 0;

        if (asset instanceof UAkMediaAssetData) {
            const audioData = asset.getRawAudioData();
            dataSize = audioData ? audioData.byteLength : 0;
            
            const formatInfo = this.getWwiseAudioFormat(asset);
            sampleRate = formatInfo.sampleRate;
            channels = formatInfo.channels;
            bitDepth = formatInfo.bitDepth;
            duration = formatInfo.duration;
        } else if (asset instanceof USoundWave) {
            const audioData = asset.getRawAudioData();
            dataSize = audioData ? audioData.byteLength : 0;
            
            sampleRate = asset.getSampleRate();
            channels = asset.getNumChannels();
            duration = asset.getDuration();
        }

        // Calculate uncompressed size
        const uncompressedSize = sampleRate * channels * (bitDepth / 8) * duration;
        const compressionRatio = uncompressedSize > 0 ? dataSize / uncompressedSize : 1;

        // Determine quality based on sample rate, bit depth, and compression
        let quality: 'Low' | 'Medium' | 'High' | 'Lossless' = 'Medium';
        
        if (compressionRatio >= 0.9) {
            quality = 'Lossless';
        } else if (sampleRate >= 48000 && bitDepth >= 24) {
            quality = 'High';
        } else if (sampleRate >= 44100 && bitDepth >= 16) {
            quality = 'Medium';
        } else {
            quality = 'Low';
        }

        return {
            quality,
            estimatedSize: dataSize,
            compressionRatio,
            sampleRate,
            channels,
            bitDepth,
            duration
        };
    }

    /**
     * Create spatial audio metadata for game engines
     */
    public static createSpatialAudioMetadata(
        wwiseEngine: UWwiseAudioEngine,
        position: { x: number, y: number, z: number } = { x: 0, y: 0, z: 0 }
    ): {
        position: { x: number, y: number, z: number };
        orientation: { x: number, y: number, z: number, w: number };
        velocity: { x: number, y: number, z: number };
        properties: I3DAudioProperties;
        zones: string[];
        effects: string[];
    } {
        const properties = this.extract3DAudioProperties(wwiseEngine);
        const audioEvents = wwiseEngine.getAudioEvents();
        
        return {
            position,
            orientation: { x: 0, y: 0, z: 0, w: 1 }, // Identity quaternion
            velocity: { x: 0, y: 0, z: 0 },
            properties,
            zones: Array.from(audioEvents.keys()).filter(key => key.includes('Zone')),
            effects: Array.from(audioEvents.keys()).filter(key => key.includes('Effect'))
        };
    }

    /**
     * Get Wwise audio format information
     */
    private static getWwiseAudioFormat(asset: UAkMediaAssetData): IAudioFormat {
        // Default format information
        const formatInfo: IAudioFormat = {
            format: 'WAV',
            sampleRate: 44100,
            channels: 2,
            bitDepth: 16,
            duration: 0
        };

        try {
            const mediaInfo = asset.getMediaInfo();
            if (mediaInfo) {
                formatInfo.sampleRate = mediaInfo.sampleRate || 44100;
                formatInfo.channels = mediaInfo.channels || 2;
                formatInfo.bitDepth = mediaInfo.bitDepth || 16;
                formatInfo.duration = mediaInfo.duration || 0;
            }
        } catch (error) {
            console.warn(`Failed to get Wwise format info: ${error}`);
        }

        return formatInfo;
    }

    /**
     * Create WAV file header
     */
    private static createWAVHeader(dataSize: number, formatInfo: IAudioFormat): ArrayBuffer {
        const header = new ArrayBuffer(44);
        const view = new DataView(header);

        // RIFF header
        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, dataSize + 36, true); // File size - 8
        view.setUint32(8, 0x57415645, false); // "WAVE"

        // Format chunk
        view.setUint32(12, 0x666D7420, false); // "fmt "
        view.setUint32(16, 16, true); // Format chunk size
        view.setUint16(20, 1, true); // Audio format (PCM)
        view.setUint16(22, formatInfo.channels, true); // Number of channels
        view.setUint32(24, formatInfo.sampleRate, true); // Sample rate
        view.setUint32(28, formatInfo.sampleRate * formatInfo.channels * (formatInfo.bitDepth / 8), true); // Byte rate
        view.setUint16(32, formatInfo.channels * (formatInfo.bitDepth / 8), true); // Block align
        view.setUint16(34, formatInfo.bitDepth, true); // Bits per sample

        // Data chunk
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, dataSize, true); // Data size

        return header;
    }

    /**
     * Convert audio to web-compatible format metadata
     */
    public static createWebAudioMetadata(asset: UAkMediaAssetData | USoundWave): {
        mimeType: string;
        codecs: string;
        canPlay: boolean;
        supportedFormats: string[];
    } {
        const analysis = this.analyzeAudioQuality(asset);
        
        // Determine best web format based on quality and browser support
        const supportedFormats: string[] = [];
        
        if (analysis.quality === 'Lossless') {
            supportedFormats.push('audio/flac', 'audio/wav');
        }
        
        supportedFormats.push('audio/ogg', 'audio/mp3', 'audio/aac');

        return {
            mimeType: 'audio/wav', // Default fallback
            codecs: `pcm,${analysis.bitDepth}bit,${analysis.sampleRate}hz`,
            canPlay: true,
            supportedFormats
        };
    }
}