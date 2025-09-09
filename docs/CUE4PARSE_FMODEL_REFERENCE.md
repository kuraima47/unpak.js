# CUE4Parse and FModel Reference Guide

This document provides key references for continuing unpak.js development based on proven implementations.

## 🎯 Primary References

### CUE4Parse (C# Implementation)
- **Repository**: https://github.com/FabianFG/CUE4Parse
- **Language**: C# (.NET)
- **Focus**: Complete UE4/UE5 asset parsing and property system
- **Key Features**: 
  - Comprehensive asset type coverage
  - Advanced property serialization system
  - Multi-game support with version handling
  - IoStore and PAK format support
  - Plugin architecture for game-specific features

### FModel (Asset Explorer)
- **Repository**: https://github.com/iAmAsval/FModel
- **Website**: https://fmodel.app/
- **Language**: C# (WPF)
- **Focus**: Visual asset explorer with preview capabilities
- **Key Features**:
  - 3D model preview and export
  - Texture visualization and conversion
  - Audio playback and export
  - Material editor and shader preview
  - Game-specific asset handling

## 🔗 Implementation Mapping

| unpak.js Feature | CUE4Parse Reference | FModel Reference |
|------------------|-------------------|------------------|
| Property System | `CUE4Parse.UE4.Objects` | Asset property display |
| Asset Types | `CUE4Parse.UE4.Assets.Exports` | Asset preview/export |
| Converters | `CUE4Parse.UE4.Converters` | Export system |
| Game Support | Game-specific providers | Game detection |
| 3D Export | Mesh converters | 3D model export |
| Audio System | Audio asset handling | Audio playback |

## 📚 Key Learning Areas

### From CUE4Parse
1. **Property Serialization**: How UE4 properties are structured and parsed
2. **Asset Relationships**: Understanding object references and dependencies  
3. **Version Handling**: Supporting multiple UE4/UE5 versions
4. **Game Providers**: Implementing game-specific logic and overrides
5. **Performance Patterns**: Efficient parsing and memory management

### From FModel
1. **User Experience**: How to present complex asset data simply
2. **Export Workflows**: Common asset export patterns and formats
3. **Preview Generation**: Creating useful asset previews
4. **Batch Operations**: Handling multiple assets efficiently
5. **Error Handling**: Graceful handling of corrupted or unsupported assets

## 🎮 Supported Games Reference

### CUE4Parse Supported Games
- Fortnite (comprehensive)
- Valorant
- Rocket League  
- Fall Guys
- Dead by Daylight
- Gears 5
- Tony Hawk's Pro Skater 1 + 2
- Many others...

### FModel Game Support
- Same as CUE4Parse with additional focus on:
  - Asset preview quality
  - Export format optimization
  - Game-specific UI features

## 🛠️ Development Workflow

### Phase Implementation Order
1. **Study CUE4Parse**: Understand the architecture and approach
2. **Implement Core**: Adapt C# patterns to TypeScript
3. **Test with FModel**: Use FModel to verify parsing accuracy
4. **Add Features**: Implement export/conversion capabilities
5. **Optimize**: Performance tuning based on real-world usage

### Code Study Approach
```typescript
// Example: Study CUE4Parse UTexture2D implementation
// Located at: CUE4Parse/UE4/Assets/Exports/Texture/UTexture2D.cs
// Adapt to: src/ue4/assets/exports/tex/UTexture2D.ts

// Example: CUE4Parse USkeletalMesh reference
// C# Source: CUE4Parse/UE4/Assets/Exports/SkeletalMesh/USkeletalMesh.cs
// TypeScript: src/ue4/assets/exports/USkeletalMesh.ts
```

### Implementation Examples

#### Skeletal Mesh Implementation
```typescript
// Following CUE4Parse USkeletalMesh structure
export class USkeletalMesh extends UObject {
    public referenceSkeleton: FReferenceSkeleton;
    public lodRenderData: Array<FSkeletalMeshLODRenderData>;
    public materials: Array<Lazy<UMaterialInterface>>;
    
    // CUE4Parse-style bone lookup
    public findBoneIndex(boneName: string): number {
        return this.referenceSkeleton.findBoneIndex(boneName);
    }
}
```

#### Mesh Export Following FModel Patterns
```typescript
// Export system based on FModel's capabilities
export class MeshConverter {
    // OBJ export similar to FModel mesh export
    public static convertSkeletalMeshToOBJ(mesh: USkeletalMesh): string {
        // Implementation follows FModel export logic
        const lines: string[] = [];
        lines.push('# Exported from unpak.js');
        // ... vertex, UV, normal, face export
        return lines.join('\n');
    }
    
    // glTF export for modern 3D workflows
    public static convertSkeletalMeshToGLTF(mesh: USkeletalMesh): any {
        // glTF 2.0 specification compliance
        return {
            asset: { version: "2.0", generator: "unpak.js v2.0" },
            // ... complete glTF structure
        };
    }
}
```

#### Audio System Enhancement
```typescript
// Wwise integration following CUE4Parse audio patterns
export class UWwiseAudioEngine extends UObject {
    public events: Array<FWwiseEvent>;
    public soundBanks: Array<FWwiseSoundBank>;
    
    // Event lookup similar to CUE4Parse
    public findEvent(eventId: number): FWwiseEvent | null {
        return this.events.find(event => event.eventId === eventId) || null;
    }
}
```

#### Physics Asset Implementation
```typescript
// Physics system based on CUE4Parse UPhysicsAsset
export class UPhysicsAsset extends UObject {
    public skeletalBodySetups: Array<Lazy<any>>;
    public constraintSetups: Array<FConstraintSetup>;
    
    // CUE4Parse-style physics body lookup
    public findBodyIndex(boneName: string): number {
        return this.bodySetupIndexMap.get(boneName) ?? -1;
    }
}
```

## 📖 Documentation References

### Technical Documentation
- **UE4 Documentation**: https://docs.unrealengine.com/4.27/
- **UE5 Documentation**: https://docs.unrealengine.com/5.3/
- **Asset Format Specs**: Available in CUE4Parse source code comments

### Community Resources
- **CUE4Parse Discord**: https://discord.gg/JQ3rJVu
- **FModel Discord**: https://discord.gg/fdkNYYQ
- **UE Modding Community**: Various forums and Discord servers

## 🔄 Contribution Guidelines

### When Adding New Features
1. **Check CUE4Parse**: Look for existing implementation
2. **Study FModel**: Understand user expectations
3. **Adapt for JS/TS**: Consider language differences
4. **Test Thoroughly**: Verify against real game files
5. **Document**: Add examples and API documentation

### Code Quality Standards
- Follow CUE4Parse naming conventions where applicable
- Maintain TypeScript strict mode compliance
- Add comprehensive tests for all new features
- Include practical examples in documentation

---

*This guide ensures unpak.js development stays aligned with proven implementations while adapting best practices for the JavaScript/TypeScript ecosystem.*