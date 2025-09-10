import { FortPersistableItemDefinition } from "./FortPersistableItemDefinition";
import { FCurveTableRowHandle } from "../../ue4/assets/exports/UCurveTable";
import { FDataTableRowHandle } from "../../ue4/objects/FDataTableRowHandle";

export class FortAccountItemDefinition extends FortPersistableItemDefinition {
    public LevelToXpHandle: FCurveTableRowHandle | null = null
    public LevelToSacrificeXpHandle: FCurveTableRowHandle | null = null
    public SacrificeRecipe: FDataTableRowHandle | null = null
    public TransmogSacrificeRow: FDataTableRowHandle | null = null
    public ConversionRecipes: FDataTableRowHandle[] | null = null
    public UpgradeRarityRecipeHandle: FDataTableRowHandle | null = null
    public MinLevel: number | null = null
    public MaxLevel: number | null = null
    public GrantToProfileType: string | null = null
}