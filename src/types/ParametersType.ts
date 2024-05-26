const equalizerList = [">", "<", ">=", "<=", "==", "!="] as const;
const params = ["ADD_IF", "COUNT_IF", "VLOOKUP", "SHOW_IF"] as const;
type Equalizer = (typeof equalizerList)[number];
export type Params = (typeof params)[number];

export interface MenuItemProp {
    param: Params;
    column: string;
    equalizer: Equalizer;
    equalTo: string | number;
}
