import { FortCharacterType } from "./FortCharacterType"
import { EFortCustomGender } from "../enums/EFortCustomGender";
import { FSoftObjectPath } from "../../ue4/objects/uobject/SoftObjectPath";
import { FGameplayTagContainer } from "../../ue4/objects/gameplaytags/FGameplayTagContainer";

export class FortWorkerType extends FortCharacterType {
    public Gender: EFortCustomGender | null = null
    public FixedPortrait: FSoftObjectPath | null = null
    public bIsManager: boolean = false
    public ManagerSynergyTag: FGameplayTagContainer | null = null
    public FixedPersonalityTag: FGameplayTagContainer | null = null
    public FixedSetBonusTag: FGameplayTagContainer | null = null
    public MatchingPersonalityBonus: number | null = null
    public MismatchingPersonalityPenalty: number | null = null
}