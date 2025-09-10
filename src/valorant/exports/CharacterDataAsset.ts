import { UObject } from "../../ue4/assets/exports/UObject";
import { FName } from "../../ue4/objects/uobject/FName";
import { FSoftObjectPath } from "../../ue4/objects/uobject/SoftObjectPath";
import { FGuid } from "../../ue4/objects/core/misc/Guid";

export class CharacterDataAsset extends UObject {
    CharacterID: FName | null = null // enum CharacterID
    Character: FSoftObjectPath | null = null
    UIData: FSoftObjectPath | null = null
    Role: FSoftObjectPath | null = null
    CharacterSelectFXC: FSoftObjectPath | null = null
    DeveloperName: FName | null = null
    bIsPlayableCharacter: boolean = false
    bAvailableForTest: boolean = false
    Uuid: FGuid | null = null
    bBaseContent: boolean = false
}