import { timelineElement } from './timeline-element';

/**
 * Helper object to track position
 */
let position = { 
    top: 0, 
    left: 0, 
    x: 0, 
    y: 0 
};

/**
 * MouseDown EventListener
 * @param event MouseEvent
 */
const mouseDownHandler = function(event: MouseEvent) {
    // Change the cursor and prevent user from selecting the text
    timelineElement.style.cursor = 'grabbing';

    position = {
        // The current scroll
        left: document.documentElement.scrollLeft,
        top: document.documentElement.scrollTop,
        // Get the current mouse position
        x: event.clientX,
        y: event.clientY,
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
};

/**
 * MouseMove EventListener
 * @param event MouseEvent
 */
const mouseMoveHandler = function(event: MouseEvent) {
    // How far the mouse has been moved
    const dx = event.clientX - position.x;
    const dy = event.clientY - position.y;
    
    // Scroll the element
    document.documentElement.scrollTop = position.top - dy;
    document.documentElement.scrollLeft = position.left - dx;
};

/**
 * MouseUp EventListener
 */
const mouseUpHandler = function() {
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);

    timelineElement.style.cursor = 'grab';
};

/**
 * Attach one listener for MouseDown
 * This event will trigger attachment of other listeners
 */
window.addEventListener('mousedown', mouseDownHandler);