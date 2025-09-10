import { UPrimaryDataAsset } from "../../ue4/assets/exports/UPrimaryDataAsset";
import { FText } from "../../ue4/objects/core/i18n/Text";
import { FSoftObjectPath } from "../../ue4/objects/uobject/SoftObjectPath";
import { FortColorPalette } from "../objects/FortColorPalette";

export class FortItemSeriesDefinition extends UPrimaryDataAsset {
    public DisplayName: FText | null = null
    public Colors: FortColorPalette | null = null
    public BackgroundTexture: FSoftObjectPath | null = null
    public ItemCardMaterial: FSoftObjectPath | null = null
    public BackgroundMaterial: FSoftObjectPath | null = null
}