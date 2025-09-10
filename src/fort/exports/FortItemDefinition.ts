import { McpItemDefinitionBase } from "./McpItemDefinitionBase"
import { EFortRarity } from "../enums/EFortRarity"
import { EFortItemType } from "../enums/EFortItemType"
import { FText } from "../../ue4/objects/core/i18n/Text"
import { FGameplayTagContainer } from "../../ue4/objects/gameplaytags/FGameplayTagContainer"
import { EFortInventoryFilter } from "../enums/EFortInventoryFilter";
import { EFortItemTier } from "../enums/EFortItemTier";
import { EFortTemplateAccess } from "../enums/EFortTemplateAccess";
import { FSoftObjectPath } from "../../ue4/objects/uobject/SoftObjectPath";
import { FVector } from "../../ue4/objects/core/math/FVector";
import { FRotator } from "../../ue4/objects/core/math/FRotator";
import { FCurveTableRowHandle } from "../../ue4/assets/exports/UCurveTable";
import { FScalableFloat } from "../../ue4/objects/FScalableFloat";
import { FortItemSeriesDefinition } from "./FortItemSeriesDefinition";
import { UProperty } from "../../util/decorators/UProperty";

export class FortItemDefinition extends McpItemDefinitionBase {
    //public OnItemCountChanged: MulticastInlineDelegateProperty
    @UProperty({ skipPrevious: 1 })
    public Rarity: EFortRarity = EFortRarity.Uncommon
    public ItemType: EFortItemType | null = null
    public PrimaryAssetIdItemTypeOverride: EFortItemType | null = null
    public FilterOverride: EFortInventoryFilter | null = null
    public Tier: EFortItemTier | null = null
    public MaxTier: EFortItemTier | null = null
    public Access: EFortTemplateAccess | null = null
    public bIsAccountItem: boolean | null = null
    public bNeverPersisted: boolean | null = null
    public bAllowMultipleStacks: boolean | null = null
    public bAutoBalanceStacks: boolean | null = null
    public bForceAutoPickup: boolean | null = null
    public bInventorySizeLimited: boolean = true
    public ItemTypeNameOverride: FText | null = null
    public DisplayName: FText | null = null
    public ShortDescription: FText | null = null
    public Description: FText | null = null
    public DisplayNamePrefix: FText | null = null
    public SearchTags: FText | null = null
    public GameplayTags: FGameplayTagContainer | null = null
    public AutomationTags: FGameplayTagContainer | null = null
    public SecondaryCategoryOverrideTags: FGameplayTagContainer | null = null
    public TertiaryCategoryOverrideTags: FGameplayTagContainer | null = null
    public MaxStackSize: FScalableFloat | null = null
    public PurchaseItemLimit: FScalableFloat | null = null
    public FrontendPreviewScale: number | null = null
    public TooltipClass: FSoftObjectPath /*SoftClassPath*/ | null = null
    public StatList: FSoftObjectPath | null = null
    public RatingLookup: FCurveTableRowHandle | null = null
    public WidePreviewImage: FSoftObjectPath | null = null
    public SmallPreviewImage: FSoftObjectPath | null = null
    public LargePreviewImage: FSoftObjectPath | null = null
    public DisplayAssetPath: FSoftObjectPath | null = null
    public Series: FortItemSeriesDefinition | null = null
    public FrontendPreviewPivotOffset: FVector | null = null
    public FrontendPreviewInitialRotation: FRotator | null = null
    public FrontendPreviewMeshOverride: FSoftObjectPath | null = null
    public FrontendPreviewSkeletalMeshOverride: FSoftObjectPath | null = null
}