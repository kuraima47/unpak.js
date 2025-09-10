import { FortAccountItemDefinition } from "./FortAccountItemDefinition"
import { FName } from "../../ue4/objects/uobject/FName"
import { FText } from "../../ue4/objects/core/i18n/Text"
import { FPackageIndex } from "../../ue4/objects/uobject/ObjectResource"
import { FGameplayTagContainer } from "../../ue4/objects/gameplaytags/FGameplayTagContainer"
import { FSoftObjectPath } from "../../ue4/objects/uobject/SoftObjectPath"
import { FGameplayTag } from "../../ue4/objects/gameplaytags/FGameplayTag"
import { CosmeticVariantInfo } from "../objects/CosmeticVariantInfo"
import { FRotator } from "../../ue4/objects/core/math/FRotator"
import { UnrealMap } from "../../util/UnrealMap"
import { FortCosmeticVariant } from "./variants/FortCosmeticVariant";
import { UProperty } from "../../util/decorators/UProperty";

export class AthenaCosmeticItemDefinition extends FortAccountItemDefinition {
    public bIsShuffleTile: boolean = false
    public bIsOwnedByCampaignHero: boolean | null = null
    public bHasMoreThanOneCharacterPartVariant: boolean | null = null
    public bHideIfNotOwned: boolean | null = null
    public bInitializedConfiguredDynamicInstallBundles: boolean | null = null
    public bDynamicInstallBundlesError: boolean | null = null
    public bDynamicInstallBundlesCancelled: boolean | null = null
    public bDynamicInstallBundlesComplete: boolean | null = null
    public DynamicInstallBundlesUpdateStartTime: number | null = null
    public DynamicInstallBundleRequestRefCount: number | null = null
    public DynamicInstallBundleRequestRetryCount: number | null = null
    public VariantUnlockType: EVariantUnlockType | null = null
    public PreviewPawnRotationOffset: FRotator | null = null
    public FoleyLibraries: FPackageIndex[] /*FoleySoundLibrary[]*/ | null = null
    public DisallowedCosmeticTags: FGameplayTagContainer | null = null
    public MetaTags: FGameplayTagContainer | null = null
    public VariantChannelsToNeverSendToMCP: FGameplayTag[] | null = null
    public ReactivePreviewDrivers: UnrealMap<CosmeticVariantInfo, FSoftObjectPath> | null = null
    public MaterialOverrides: AthenaCosmeticMaterialOverride[] | null = null
    public ObservedPlayerStats: FGameplayTagContainer | null = null
    public BuiltInEmotes: FPackageIndex[] /*UFortMontageItemDefinitionBase[]*/ | null = null
    public ItemVariants: FortCosmeticVariant[] | null = null
    public VariantChannelToUseForThumbnails: FGameplayTag | null = null
    public ItemVariantPreviews: FortCosmeticVariantPreview[] | null = null
    public DirectAquisitionStyleDisclaimerOverride: FText | null = null
    //public List<FortCosmeticAdaptiveStatPreview> ItemObservedStatPreviews
    @UProperty({ skipPrevious: 1 })
    public UnlockRequirements: FText | null = null
    public UnlockingItemDef: FSoftObjectPath | null = null
    public ItemPreviewActorClass: FSoftObjectPath /*SoftClassPath*/ | null = null
    public ItemPreviewParticleSystem: FSoftObjectPath | null = null
    public ItemPreviewMontage_Male: FSoftObjectPath | null = null
    public ItemPreviewMontage_Female: FSoftObjectPath | null = null
    public ItemPreviewHero: FSoftObjectPath | null = null
    public ConfiguredDynamicInstallBundles: FName[] | null = null
    public PendingDynamicInstallBundles: FName[] | null = null
    public ExclusiveRequiresOutfitTags: FGameplayTagContainer | null = null
    public CustomExclusiveCallout: FText | null = null
    public ExclusiveDesciption: FText | null = null
    public ExclusiveIcon: FSoftObjectPath | null = null
}

export enum EVariantUnlockType {
    UnlockAll,
    ExclusiveChoice
}

export class WeirdVariantStruct {
    public Unknown0: FGameplayTag | null = null
    public Unknown1: FGameplayTag | null = null
}

export class AthenaCosmeticMaterialOverride {
    public ComponentName: FName | null = null
    public MaterialOverrideIndex: number | null = null
    public OverrideMaterial: FSoftObjectPath | null = null
}

export class FortCosmeticVariantPreview {
    public UnlockCondition: FText | null = null
    public PreviewTime: number | null = null
    public VariantOptions: McpVariantChannelInfo[] | null = null
    public AdditionalItems: FortCosmeticVariantPreviewElement[] | null = null
}

export class McpVariantChannelInfo extends CosmeticVariantInfo {
    public OwnedVariantTags: FGameplayTagContainer | null = null
    public ItemVariantIsUsedFor: FPackageIndex /*FortItemDefinition*/ | null = null
    public CustomData: string | null = null
}

export class FortCosmeticVariantPreviewElement {
    public VariantOptions: McpVariantChannelInfo[] | null = null
    public Item: FPackageIndex /*AthenaCosmeticItemDefinition*/ | null = null
}