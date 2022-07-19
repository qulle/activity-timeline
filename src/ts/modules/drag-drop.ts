import { timelineElement } from './timeline-element';

/**
 * Prevent Browser default behaviour when a file is dropped
 * @param event BrowserEvent
 */
const preventDefaults = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
}

/**
 * Highlight drop area when item is dragged over it
 */
const highlight = () => {
    timelineElement.classList.add('timeline--highlight');
}

/**
 * Remove highlight background when file leaves or is dropped
 */
const unhighlight = () => {
    timelineElement.classList.remove('timeline--highlight');
}

/**
 * Prevent default drag behaviors
 */
['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName: string) => {
    timelineElement.addEventListener(eventName, preventDefaults);
    document.documentElement.addEventListener(eventName, preventDefaults);
    document.body.addEventListener(eventName, preventDefaults);
});

/**
 * Highlight drop area when item is dragged over it
 */
['dragenter', 'dragover'].forEach((eventName: string) => {
    timelineElement.addEventListener(eventName, highlight);
});

/**
 * Remove highlight background when file leaves or is dropped
 */
['dragleave', 'drop'].forEach((eventName: string) => {
    timelineElement.addEventListener(eventName, unhighlight);
});
