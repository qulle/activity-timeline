import { Style } from "../models/style.model";

/**
 * Default object containing style information
 * This data can be overridden from the JSON-file
 * "style": {
 *     "backgroundColor": "#3B4352"
 * },
 * "days": [...]
 */
const DefaultStyle: Style = {
    fontSize: 14,
    lineThickness: 2,
    timelineStrokeColor: '#3B4352',
    strokeColor: '#3B4352',
    fillColor: '#BAC8D3',
    textColor: '#3B4352',
    backgroundColor: '#FFFFFF'
};

export { DefaultStyle };
