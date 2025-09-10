import { FortWorkerType } from "./FortWorkerType"
import { FSoftObjectPath } from "../../ue4/objects/uobject/SoftObjectPath"
import { FPackageIndex } from "../../ue4/objects/uobject/ObjectResource"
import { FText } from "../../ue4/objects/core/i18n/Text"
import { FDataTableRowHandle } from "../../ue4/objects/FDataTableRowHandle"
import { FGameplayTagContainer } from "../../ue4/objects/gameplaytags/FGameplayTagContainer";
import { FortAttributeInitializationKey } from "../objects/FortAttributeInitializationKey";
import { GameplayEffectApplicationInfo } from "../objects/GameplayEffectApplicationInfo";

export class FortHeroType extends FortWorkerType {
    public bForceShowHeadAccessory: boolean | null = null
    public bForceShowBackpack: boolean | null = null
    public Specializations: FSoftObjectPath[] | null = null
    public DefaultMontageLookupTable: FSoftObjectPath | null = null
    public OverrideMontageLookupTable: FSoftObjectPath | null = null
    public CombinedStatGEs: GameplayEffectApplicationInfo[] | null = null
    public RequiredGPTags: FGameplayTagContainer | null = null
    public MaleOverrideFeedback: FSoftObjectPath | null = null
    public FemaleOverrideFeedback: FSoftObjectPath | null = null
    public OverridePawnClass: FSoftObjectPath /*SoftClassPath*/ | null = null
    public HeroGameplayDefinition: FPackageIndex /*FortHeroGameplayDefinition*/ | null = null
    public HeroCosmeticOutfitDefinition: FPackageIndex /*AthenaCharacterItemDefinition*/ | null = null
    public HeroCosmeticBackblingDefinition: FPackageIndex /*AthenaBackpackItemDefinition*/ | null = null
    public FrontEndAnimClass: FSoftObjectPath /*SoftClassPath*/ | null = null
    public ItemPreviewAnimClass: FSoftObjectPath /*SoftClassPath*/ | null = null
    public FrontendAnimMontageIdleOverride: FSoftObjectPath | null = null
    public FrontEndBackPreviewRotationOffset: number | null = null
    public Subtype: FText | null = null
    public AttributeInitKey: FortAttributeInitializationKey | null = null
    public LegacyStatHandle: FDataTableRowHandle | null = null
    public ItemPreviewMontage_Male: FSoftObjectPath | null = null
    public ItemPreviewMontage_Female: FSoftObjectPath | null = null
}