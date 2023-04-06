/**
 * Traps the focus to always stay in the target component
 * @param event KeyboardEvent
 */
const trapFocus = function(event: KeyboardEvent) {
    const isTabKey = event.key === 'Tab';
    if(!Boolean(isTabKey)) {
        return;
    }

    const elements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const firstElement = this.querySelectorAll(elements)[0];
    const content = this.querySelectorAll(elements);
    const lastElement = content[content.length - 1];

    if(Boolean(event.shiftKey)) {
        if(document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
        }
    }else {
        if(document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
        }
    }
}

export { trapFocus };
