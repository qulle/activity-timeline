import { Meta } from "../models/meta.model";

const VERION = require('/package.json').version;

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
    version: VERION,
    locale: 'en-us'
};

export { DefaultMeta };
