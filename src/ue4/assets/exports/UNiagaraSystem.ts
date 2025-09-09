import { FArchive } from "../../reader/FArchive";
import { FAssetRegistryTag } from "../../registry/objects/FAssetRegistryTag";

/**
 * Niagara Emitter information
 */
export class FNiagaraEmitter {
    public emitterName: string = "";
    public isEnabled: boolean = true;
    public emitterScript?: string;
    public spawnScript?: string;
    public updateScript?: string;
    public renderScript?: string;
    public simulationStages: string[] = [];
    public properties: Map<string, any> = new Map();

    constructor(Ar?: any) {
        if (Ar && typeof Ar.readString === 'function') {
            this.emitterName = Ar.readString();
            this.isEnabled = Ar.readBoolean();
            this.emitterScript = Ar.readString();
            this.spawnScript = Ar.readString();
            this.updateScript = Ar.readString();
            this.renderScript = Ar.readString();
            
            // Read simulation stages
            const numStages = Ar.readInt32();
            for (let i = 0; i < numStages; i++) {
                const stage = Ar.readString();
                if (stage) {
                    this.simulationStages.push(stage);
                }
            }

            // Read emitter properties
            const numProperties = Ar.readInt32();
            for (let i = 0; i < numProperties; i++) {
                const propName = Ar.readString();
                const propType = Ar.readString();
                let propValue: any = null;

                switch (propType) {
                    case "bool":
                        propValue = Ar.readBoolean();
                        break;
                    case "float":
                        propValue = Ar.readFloat32();
                        break;
                    case "int":
                        propValue = Ar.readInt32();
                        break;
                    case "string":
                        propValue = Ar.readString();
                        break;
                    default:
                        propValue = Ar.readString();
                        break;
                }

                if (propName) {
                    this.properties.set(propName, propValue);
                }
            }
        }
    }

    public isActive(): boolean {
        return this.isEnabled;
    }

    public getProperty(name: string): any {
        return this.properties.get(name);
    }
}

/**
 * Niagara System Asset
 * Represents UE5 Niagara particle system - the modern replacement for Cascade
 * Based on CUE4Parse UNiagaraSystem implementation
 */
export class UNiagaraSystem {
    /** Whether this system is currently active */
    public isActive: boolean = true;
    
    /** System execution state */
    public systemState: string = "Active";
    
    /** Collection of emitters in this system */
    public emitters: FNiagaraEmitter[] = [];
    
    /** System-level scripts */
    public systemSpawnScript?: string;
    public systemUpdateScript?: string;
    
    /** System parameters */
    public systemParameters: Map<string, any> = new Map();
    
    /** User parameters exposed to designers */
    public userParameters: Map<string, any> = new Map();
    
    /** Whether this system supports fixed bounds */
    public hasFixedBounds: boolean = false;
    
    /** Fixed bounds for the system */
    public fixedBounds: { min: number[], max: number[] } | null = null;
    
    /** Warm up settings */
    public warmupTime: number = 0;
    public warmupTickCount: number = 0;
    public warmupTickDelta: number = 0;
    
    /** LOD settings */
    public supportsCulling: boolean = true;
    public maxDistance: number = 0;
    
    /** Platform-specific settings */
    public platformSettings: Map<string, any> = new Map();

    constructor(Ar: FArchive, exportType?: string) {
        this.deserializeNiagaraSystemData(Ar);
    }

    /**
     * Deserialize Niagara system specific data
     */
    private deserializeNiagaraSystemData(Ar: FArchive): void {
        try {
            // Read system state
            this.isActive = Ar.readBoolean();
            this.systemState = Ar.readString();

            // Read system scripts
            this.systemSpawnScript = Ar.readString();
            this.systemUpdateScript = Ar.readString();

            // Read warmup settings
            this.warmupTime = Ar.readFloat32();
            this.warmupTickCount = Ar.readInt32();
            this.warmupTickDelta = Ar.readFloat32();

            // Read LOD settings
            this.supportsCulling = Ar.readBoolean();
            this.maxDistance = Ar.readFloat32();

            // Read fixed bounds
            this.hasFixedBounds = Ar.readBoolean();
            if (this.hasFixedBounds) {
                this.fixedBounds = {
                    min: [Ar.readFloat32(), Ar.readFloat32(), Ar.readFloat32()],
                    max: [Ar.readFloat32(), Ar.readFloat32(), Ar.readFloat32()]
                };
            }

            // Read system parameters
            const numSystemParams = Ar.readInt32();
            for (let i = 0; i < numSystemParams; i++) {
                const paramName = Ar.readString();
                const paramType = Ar.readString();
                let paramValue: any = null;

                switch (paramType) {
                    case "bool":
                        paramValue = Ar.readBoolean();
                        break;
                    case "float":
                        paramValue = Ar.readFloat32();
                        break;
                    case "int":
                        paramValue = Ar.readInt32();
                        break;
                    case "vector3":
                        paramValue = [Ar.readFloat32(), Ar.readFloat32(), Ar.readFloat32()];
                        break;
                    case "color":
                        paramValue = [Ar.readFloat32(), Ar.readFloat32(), Ar.readFloat32(), Ar.readFloat32()];
                        break;
                    default:
                        paramValue = Ar.readString();
                        break;
                }

                if (paramName) {
                    this.systemParameters.set(paramName, paramValue);
                }
            }

            // Read user parameters
            const numUserParams = Ar.readInt32();
            for (let i = 0; i < numUserParams; i++) {
                const paramName = Ar.readString();
                const paramType = Ar.readString();
                let paramValue: any = null;

                switch (paramType) {
                    case "bool":
                        paramValue = Ar.readBoolean();
                        break;
                    case "float":
                        paramValue = Ar.readFloat32();
                        break;
                    case "int":
                        paramValue = Ar.readInt32();
                        break;
                    case "vector3":
                        paramValue = [Ar.readFloat32(), Ar.readFloat32(), Ar.readFloat32()];
                        break;
                    case "color":
                        paramValue = [Ar.readFloat32(), Ar.readFloat32(), Ar.readFloat32(), Ar.readFloat32()];
                        break;
                    default:
                        paramValue = Ar.readString();
                        break;
                }

                if (paramName) {
                    this.userParameters.set(paramName, paramValue);
                }
            }

            // Read emitters
            const numEmitters = Ar.readInt32();
            for (let i = 0; i < numEmitters; i++) {
                const emitter = new FNiagaraEmitter(Ar);
                this.emitters.push(emitter);
            }

            // Read platform settings
            const numPlatforms = Ar.readInt32();
            for (let i = 0; i < numPlatforms; i++) {
                const platformName = Ar.readString();
                const settingsData = Ar.readString(); // Platform-specific serialized data
                if (platformName) {
                    this.platformSettings.set(platformName, settingsData);
                }
            }
        } catch (error) {
            // If parsing fails, continue with base object functionality
            console.warn(`Failed to parse Niagara system data: ${error}`);
        }
    }

    /**
     * Get active emitters only
     */
    public getActiveEmitters(): FNiagaraEmitter[] {
        return this.emitters.filter(emitter => emitter.isActive());
    }

    /**
     * Get emitter by name
     */
    public getEmitterByName(name: string): FNiagaraEmitter | undefined {
        return this.emitters.find(emitter => emitter.emitterName === name);
    }

    /**
     * Get system parameter value
     */
    public getSystemParameter(name: string): any {
        return this.systemParameters.get(name);
    }

    /**
     * Get user parameter value
     */
    public getUserParameter(name: string): any {
        return this.userParameters.get(name);
    }

    /**
     * Check if system is currently active
     */
    public getIsActive(): boolean {
        return this.isActive && this.systemState === "Active";
    }

    /**
     * Get system complexity estimate
     */
    public getComplexityEstimate(): number {
        let complexity = this.emitters.length;
        for (const emitter of this.emitters) {
            complexity += emitter.simulationStages.length;
            complexity += emitter.properties.size / 10; // Weight properties less
        }
        return complexity;
    }

    /**
     * Check if system has any GPU simulations
     */
    public hasGPUSimulation(): boolean {
        return this.emitters.some(emitter => 
            emitter.getProperty("SimTarget") === "GPUComputeSim"
        );
    }

    /**
     * Get asset registry tags for Niagara systems
     */
    public getAssetRegistryTags(): FAssetRegistryTag[] {
        const tags: FAssetRegistryTag[] = [];
        
        tags.push({
            key: "SystemState",
            value: this.systemState
        } as FAssetRegistryTag);

        tags.push({
            key: "EmitterCount",
            value: this.emitters.length.toString()
        } as FAssetRegistryTag);

        tags.push({
            key: "ActiveEmitterCount",
            value: this.getActiveEmitters().length.toString()
        } as FAssetRegistryTag);

        tags.push({
            key: "HasGPUSimulation",
            value: this.hasGPUSimulation().toString()
        } as FAssetRegistryTag);

        tags.push({
            key: "ComplexityEstimate",
            value: this.getComplexityEstimate().toString()
        } as FAssetRegistryTag);

        tags.push({
            key: "WarmupTime",
            value: this.warmupTime.toString()
        } as FAssetRegistryTag);

        tags.push({
            key: "MaxDistance",
            value: this.maxDistance.toString()
        } as FAssetRegistryTag);

        tags.push({
            key: "HasFixedBounds",
            value: this.hasFixedBounds.toString()
        } as FAssetRegistryTag);

        return tags;
    }

    public toString(): string {
        return `UNiagaraSystem(state=${this.systemState}, emitters=${this.emitters.length}, active=${this.getActiveEmitters().length}, gpu=${this.hasGPUSimulation()})`;
    }
}