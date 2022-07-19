import { TimelineStyle } from "../models/timeline-style.model";

/**
 * This data can be overridden from the JSON-file
 * Adding the style-node
 * "style": {
 *     "backgroundColor": "#3B4352"
 * },
 * "days": [...]
 */
const TimelineStyle: TimelineStyle = {
    fontSize: 14,
    lineThickness: 2,
    timelineStrokeColor: '#3B4352',
    strokeColor: '#3B4352',
    fillColor: '#BAC8D3',
    textColor: '#3B4352',
    backgroundColor: '#FFFFFF'
};

export { TimelineStyle };
