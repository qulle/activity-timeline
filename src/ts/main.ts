import { Timeline } from './modules/Timeline';

/**
 * Initiate Timeline instance
 * This will render the landing page
 */
const timelineElement = <HTMLCanvasElement>document.getElementById('activity-timeline');
const timeline = new Timeline(timelineElement);
