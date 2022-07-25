import { Meta } from "../models/meta.model";

/**
 * Default object containing meta information 
 * This data can be overridden from the JSON-file
 * "meta": {
 *     "locale": "sv-se"
 * }
 * "style": {...},
 * "days": [...]
 */
const DefaultMeta: Meta = {
    locale: 'en-us'
};

export { DefaultMeta };
