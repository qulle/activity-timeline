import { Data } from "../models/data.model";
import { DefaultMeta } from "./meta.default";
import { DefaultStyle } from "./style.default";

/**
 * Main default object containing the complete object used in the Timeline
 * This object is merged with the loaded JSON-file using the spread operator
 */
const DefaultData: Data = {
    meta: DefaultMeta,
    style: DefaultStyle,
    days: []
};

export { DefaultData };
