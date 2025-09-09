import { FAssetArchive } from "../reader/FAssetArchive";
import { UObject } from "./UObject";
import { FName } from "../../objects/uobject/FName";

/**
 * UMediaSource - Base class for media sources
 * Represents video and media assets in UE4/UE5
 */
export class UMediaSource extends UObject {
    /** 
     * Media URL or path
     * @type {string}
     * @public
     */
    mediaUrl: string = "";

    /** 
     * Media duration in seconds
     * @type {number}
     * @public
     */
    duration: number = 0.0;

    /** 
     * Media format information
     * @type {FName}
     * @public
     */
    format: FName = new FName();

    /** 
     * Whether the media should loop
     * @type {boolean}
     * @public
     */
    isLooping: boolean = false;

    /**
     * Deserializes media source properties
     * @param {FAssetArchive} Ar Reader to use
     * @param {number} validPos Valid position of Reader
     * @returns {void}
     * @public
     */
    deserialize(Ar: FAssetArchive, validPos: number) {
        super.deserialize(Ar, validPos);
        // Media-specific properties would be deserialized here
        // This is a basic implementation - real implementation would
        // parse media-specific data from the properties
    }

    /**
     * Returns JSON representation
     * @returns {any} JSON object
     * @public
     */
    toJson(): any {
        return {
            ...super.toJson(),
            mediaUrl: this.mediaUrl,
            duration: this.duration,
            format: this.format.text,
            isLooping: this.isLooping
        };
    }
}

/**
 * UFileMediaSource - File-based media source
 * Represents local file media assets
 */
export class UFileMediaSource extends UMediaSource {
    /** 
     * File path to the media
     * @type {string}
     * @public
     */
    filePath: string = "";

    /**
     * Returns JSON representation
     * @returns {any} JSON object
     * @public
     */
    toJson(): any {
        return {
            ...super.toJson(),
            filePath: this.filePath
        };
    }
}

/**
 * UStreamMediaSource - Streaming media source
 * Represents network streaming media assets
 */
export class UStreamMediaSource extends UMediaSource {
    /** 
     * Stream URL
     * @type {string}
     * @public
     */
    streamUrl: string = "";

    /**
     * Returns JSON representation
     * @returns {any} JSON object
     * @public
     */
    toJson(): any {
        return {
            ...super.toJson(),
            streamUrl: this.streamUrl
        };
    }
}