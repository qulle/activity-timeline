import './modules/drag-scroll';
import './modules/drag-drop';
import { timelineElement } from './modules/timeline-element';
import Timeline from './modules/timeline';

/**
 * Initiate Timeline instance
 * This will draw the landing page
 */
const timeline = new Timeline({
    canvas: timelineElement,
    locale: 'en-us'
});

/**
 * Parse the given file that was dropped and draw the timeline
 * @param file The files that was dropped
 */
const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = function() {
        // Load data
        timeline.setData(JSON.parse(<string>reader.result));

        // Trigger render of timeline
        timeline.render();

        // Scroll last day into viewport
        timelineElement.scrollIntoView({
            behavior: 'auto',
            block: 'center',
            inline: 'end'
        });
    }
}

/**
 * When a file is dropped
 * @param event Browser DragEvent
 */
const handleDrop = (event: DragEvent) => {
    const SINGLE_FILE = 1;
    const dataTransfer = event.dataTransfer;
    const files = dataTransfer.files;

    if(files.length === SINGLE_FILE) {
        [...files].forEach(file => {
            parseFile(file);
        });
    }
}

/**
 * Handle files that are dropped
 */
timelineElement.addEventListener('drop', handleDrop);
