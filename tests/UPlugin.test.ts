import { UPluginParser, PluginDependencyResolver, IPluginDescriptor } from '../src/ue4/assets/plugins/UPlugin';

describe('UPlugin Parser', () => {
    const samplePluginData: IPluginDescriptor = {
        fileVersion: 3,
        version: 1,
        versionName: "1.0",
        friendlyName: "Sample Plugin",
        description: "A sample plugin for testing",
        category: "Testing",
        createdBy: "Test Developer",
        canContainContent: true,
        modules: [
            {
                name: "SampleModule",
                type: "Runtime",
                loadingPhase: "Default"
            },
            {
                name: "SampleEditor",
                type: "Editor",
                loadingPhase: "PostEngineInit"
            }
        ],
        plugins: [
            {
                name: "RequiredPlugin",
                enabled: true,
                optional: false
            },
            {
                name: "OptionalPlugin",
                enabled: true,
                optional: true
            }
        ]
    };

    test('should parse plugin from JSON', () => {
        const json = JSON.stringify(samplePluginData);
        const parser = UPluginParser.fromJSON(json);
        
        expect(parser.getPluginName()).toBe("Sample Plugin");
        expect(parser.getVersion()).toBe(1);
        expect(parser.getVersionName()).toBe("1.0");
        expect(parser.getDescription()).toBe("A sample plugin for testing");
        expect(parser.getCategory()).toBe("Testing");
    });

    test('should parse plugin from buffer', () => {
        const json = JSON.stringify(samplePluginData);
        const buffer = Buffer.from(json, 'utf-8');
        const parser = UPluginParser.fromBuffer(buffer);
        
        expect(parser.getPluginName()).toBe("Sample Plugin");
    });

    test('should get plugin modules', () => {
        const parser = new UPluginParser(samplePluginData);
        const modules = parser.getModules();
        
        expect(modules).toHaveLength(2);
        expect(modules[0].name).toBe("SampleModule");
        expect(modules[0].type).toBe("Runtime");
        expect(modules[1].name).toBe("SampleEditor");
        expect(modules[1].type).toBe("Editor");
    });

    test('should get runtime and editor modules separately', () => {
        const parser = new UPluginParser(samplePluginData);
        
        const runtimeModules = parser.getRuntimeModules();
        expect(runtimeModules).toHaveLength(1);
        expect(runtimeModules[0].name).toBe("SampleModule");
        
        const editorModules = parser.getEditorModules();
        expect(editorModules).toHaveLength(1);
        expect(editorModules[0].name).toBe("SampleEditor");
    });

    test('should get dependencies', () => {
        const parser = new UPluginParser(samplePluginData);
        
        const allDependencies = parser.getDependencies();
        expect(allDependencies).toHaveLength(2);
        
        const requiredDependencies = parser.getRequiredDependencies();
        expect(requiredDependencies).toHaveLength(1);
        expect(requiredDependencies[0].name).toBe("RequiredPlugin");
        
        const optionalDependencies = parser.getOptionalDependencies();
        expect(optionalDependencies).toHaveLength(1);
        expect(optionalDependencies[0].name).toBe("OptionalPlugin");
    });

    test('should validate plugin descriptor', () => {
        const parser = new UPluginParser(samplePluginData);
        const errors = parser.validate();
        expect(errors).toHaveLength(0);
        
        // Test invalid plugin
        const invalidPlugin = { ...samplePluginData, modules: [] };
        const invalidParser = new UPluginParser(invalidPlugin);
        const invalidErrors = invalidParser.validate();
        expect(invalidErrors.length).toBeGreaterThan(0);
    });

    test('should support platform checking', () => {
        const parser = new UPluginParser(samplePluginData);
        
        // No platform restrictions = all platforms supported
        expect(parser.supportsPlatform("Windows")).toBe(true);
        expect(parser.supportsPlatform("Mac")).toBe(true);
        expect(parser.supportsPlatform("Linux")).toBe(true);
        
        // Test with whitelist
        const whitelistedPlugin = {
            ...samplePluginData,
            whitelistPlatforms: ["Windows", "Mac"]
        };
        const whitelistedParser = new UPluginParser(whitelistedPlugin);
        expect(whitelistedParser.supportsPlatform("Windows")).toBe(true);
        expect(whitelistedParser.supportsPlatform("Linux")).toBe(false);
        
        // Test with blacklist
        const blacklistedPlugin = {
            ...samplePluginData,
            blacklistPlatforms: ["Linux"]
        };
        const blacklistedParser = new UPluginParser(blacklistedPlugin);
        expect(blacklistedParser.supportsPlatform("Windows")).toBe(true);
        expect(blacklistedParser.supportsPlatform("Linux")).toBe(false);
    });

    test('should convert to JSON', () => {
        const parser = new UPluginParser(samplePluginData);
        const json = parser.toJson();
        expect(json).toEqual(samplePluginData);
    });
});

describe('Plugin Dependency Resolver', () => {
    test('should resolve dependencies correctly', () => {
        const resolver = new PluginDependencyResolver();
        
        // Create test plugins
        const pluginA: IPluginDescriptor = {
            fileVersion: 3,
            version: 1,
            friendlyName: "Plugin A",
            modules: [{ name: "ModuleA", type: "Runtime" }],
            plugins: [
                { name: "Plugin B", enabled: true, optional: false }
            ]
        };
        
        const pluginB: IPluginDescriptor = {
            fileVersion: 3,
            version: 1,
            friendlyName: "Plugin B",
            modules: [{ name: "ModuleB", type: "Runtime" }]
        };
        
        const pluginC: IPluginDescriptor = {
            fileVersion: 3,
            version: 1,
            friendlyName: "Plugin C",
            modules: [{ name: "ModuleC", type: "Runtime" }],
            plugins: [
                { name: "Plugin A", enabled: true, optional: false }
            ]
        };
        
        resolver.addPlugin("Plugin A", new UPluginParser(pluginA));
        resolver.addPlugin("Plugin B", new UPluginParser(pluginB));
        resolver.addPlugin("Plugin C", new UPluginParser(pluginC));
        
        // Test successful resolution
        const resultA = resolver.resolveDependencies("Plugin A");
        expect(resultA.resolved).toBe(true);
        expect(resultA.missing).toHaveLength(0);
        
        // Test missing dependency
        const resultMissing = resolver.resolveDependencies("Plugin D");
        expect(resultMissing.resolved).toBe(false);
        expect(resultMissing.missing).toContain("Plugin D");
        
        // Test circular dependency detection
        const circularPlugin: IPluginDescriptor = {
            fileVersion: 3,
            version: 1,
            friendlyName: "Plugin Circular",
            modules: [{ name: "ModuleCircular", type: "Runtime" }],
            plugins: [
                { name: "Plugin A", enabled: true, optional: false }
            ]
        };
        
        // Create circular dependency: A -> B, B -> Circular, Circular -> A
        const modifiedPluginB = {
            ...pluginB,
            plugins: [{ name: "Plugin Circular", enabled: true, optional: false }]
        };
        
        resolver.addPlugin("Plugin B", new UPluginParser(modifiedPluginB));
        resolver.addPlugin("Plugin Circular", new UPluginParser(circularPlugin));
        
        const circularResult = resolver.resolveDependencies("Plugin A");
        expect(circularResult.circular.length).toBeGreaterThan(0);
    });

    test('should find dependents correctly', () => {
        const resolver = new PluginDependencyResolver();
        
        const pluginA: IPluginDescriptor = {
            fileVersion: 3,
            version: 1,
            friendlyName: "Plugin A",
            modules: [{ name: "ModuleA", type: "Runtime" }]
        };
        
        const pluginB: IPluginDescriptor = {
            fileVersion: 3,
            version: 1,
            friendlyName: "Plugin B",
            modules: [{ name: "ModuleB", type: "Runtime" }],
            plugins: [{ name: "Plugin A", enabled: true, optional: false }]
        };
        
        const pluginC: IPluginDescriptor = {
            fileVersion: 3,
            version: 1,
            friendlyName: "Plugin C",
            modules: [{ name: "ModuleC", type: "Runtime" }],
            plugins: [{ name: "Plugin A", enabled: true, optional: false }]
        };
        
        resolver.addPlugin("Plugin A", new UPluginParser(pluginA));
        resolver.addPlugin("Plugin B", new UPluginParser(pluginB));
        resolver.addPlugin("Plugin C", new UPluginParser(pluginC));
        
        const dependents = resolver.getDependents("Plugin A");
        expect(dependents).toContain("Plugin B");
        expect(dependents).toContain("Plugin C");
        expect(dependents).toHaveLength(2);
    });
});