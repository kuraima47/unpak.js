import { UObject } from "../../ue4/assets/exports/UObject";
import { FText } from "../../ue4/objects/core/i18n/Text";
import { FPackageIndex } from "../../ue4/objects/uobject/ObjectResource";

export class CharacterRoleUIData extends UObject {
    DisplayName: FText | null = null
    Description: FText | null = null
    DisplayIcon: FPackageIndex | null = null
}