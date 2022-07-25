import { Day } from "./day.model";
import { Meta } from "./meta.model";
import { Style } from "./style.model";

export interface Data {
    meta: Meta,
    style: Style,
    days: Day[]
};
