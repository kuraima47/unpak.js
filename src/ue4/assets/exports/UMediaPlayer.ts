import { FPackageIndex } from '../../objects/uobject/ObjectResource';
import { UObject } from '../exports/UObject';
import { FAssetArchive } from '../reader/FAssetArchive';
import { UProperty } from '../../../util/decorators/UProperty';
import { FSoftObjectPath } from '../../objects/uobject/SoftObjectPath';

/**
 * UMediaPlayer - Media player assets for video/audio playback
 * Phase 4 - Asset Type Coverage expansion
 * Based on CUE4Parse UMediaPlayer implementation
 */
export class UMediaPlayer extends UObject {
    @UProperty()
    public PlayOnOpen: boolean = false;
    
    @UProperty()
    public Shuffle: boolean = false;
    
    @UProperty()
    public Loop: boolean = false;
    
    @UProperty()
    public PlaybackRate: number = 1.0;
    
    @UProperty()
    public InitialMediaSource: FPackageIndex | null = null;
    
    @UProperty()
    public PlaylistMediaSources: FPackageIndex[] | null = null;
    
    @UProperty()
    public CacheAhead: number = 0.0;
    
    @UProperty()
    public CacheBehind: number = 0.0;
    
    @UProperty()
    public CacheBehindGame: number = 0.0;
    
    @UProperty()
    public NativeAudioOut: boolean = false;
    
    @UProperty()
    public VideoOutputSampleFormat: string | null = null;

    constructor(Ar: FAssetArchive, validPos: number) {
        super(Ar, validPos);
    }

    /**
     * Export media player configuration
     */
    exportMediaConfig(): {
        playOnOpen: boolean;
        shuffle: boolean;
        loop: boolean;
        playbackRate: number;
        initialSource: FPackageIndex | null;
        playlist: FPackageIndex[] | null;
        cacheSettings: {
            ahead: number;
            behind: number;
            behindGame: number;
        };
        audioSettings: {
            nativeOut: boolean;
            videoSampleFormat: string | null;
        };
    } {
        return {
            playOnOpen: this.PlayOnOpen,
            shuffle: this.Shuffle,
            loop: this.Loop,
            playbackRate: this.PlaybackRate,
            initialSource: this.InitialMediaSource,
            playlist: this.PlaylistMediaSources,
            cacheSettings: {
                ahead: this.CacheAhead,
                behind: this.CacheBehind,
                behindGame: this.CacheBehindGame
            },
            audioSettings: {
                nativeOut: this.NativeAudioOut,
                videoSampleFormat: this.VideoOutputSampleFormat
            }
        };
    }

    /**
     * Get media sources count
     */
    getMediaSourcesCount(): number {
        return (this.PlaylistMediaSources?.length || 0) + (this.InitialMediaSource ? 1 : 0);
    }

    /**
     * Check if player is configured for streaming
     */
    isStreamingPlayer(): boolean {
        return this.CacheAhead > 0 || this.CacheBehind > 0;
    }

    /**
     * Get playback configuration summary
     */
    getPlaybackSummary(): string {
        const sources = this.getMediaSourcesCount();
        const streaming = this.isStreamingPlayer() ? " (Streaming)" : "";
        const loop = this.Loop ? " (Looped)" : "";
        const shuffle = this.Shuffle ? " (Shuffled)" : "";
        
        return `MediaPlayer: ${sources} source(s)${streaming}${loop}${shuffle}`;
    }
}

/**
 * UMediaPlayerSource - Media source reference for MediaPlayer
 * Supporting video, audio, and streaming media
 */
export class UMediaPlayerSource extends UObject {
    @UProperty()
    public MediaUrl: string | null = null;
    
    @UProperty()
    public MediaOptions: Map<string, string> | null = null;

    constructor(Ar: FAssetArchive, validPos: number) {
        super(Ar, validPos);
    }

    /**
     * Get media URL
     */
    getMediaUrl(): string | null {
        return this.MediaUrl;
    }

    /**
     * Get media type from URL
     */
    getMediaType(): string {
        if (!this.MediaUrl) return "unknown";
        
        const ext = this.MediaUrl.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'mp4':
            case 'mov':
            case 'avi':
            case 'mkv':
                return "video";
            case 'mp3':
            case 'wav':
            case 'ogg':
            case 'flac':
                return "audio";
            case 'm3u8':
            case 'mpd':
                return "stream";
            default:
                return "unknown";
        }
    }

    /**
     * Export media source data
     */
    exportMediaSource(): {
        url: string | null;
        type: string;
        options: Map<string, string> | null;
    } {
        return {
            url: this.MediaUrl,
            type: this.getMediaType(),
            options: this.MediaOptions
        };
    }
}