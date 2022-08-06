import { trapFocusKeyListener } from '../helpers/TrapFocus';

const ANIMATION_CLASS = 'at-animations--bounce';

class DialogBase {
    protected dialogBackdrop: HTMLDivElement;

    constructor() {
        const dialogBackdrop = document.createElement('div');
        dialogBackdrop.className = 'at-dialog-backdrop at-dialog-backdrop--fixed';
        dialogBackdrop.setAttribute('tabindex', '-1');
        dialogBackdrop.addEventListener('keydown', trapFocusKeyListener);
        dialogBackdrop.addEventListener('click', this.bounceAnimation.bind(this));

        this.dialogBackdrop = dialogBackdrop;

        window.addEventListener('keyup', (event) => {
            if(event.key.toLowerCase() === 'escape') {
                this.close();
            }
        });
    }

    private bounceAnimation(event: MouseEvent): void {
        // To prevent trigger the animation if clicked in the dialog and not the backdrop
        if(event.target !== this.dialogBackdrop) {
            return;
        }

        const dialog = this.dialogBackdrop.firstElementChild as HTMLDivElement;

        dialog.classList.remove(ANIMATION_CLASS);

        // Trigger reflow of DOM, reruns animation when class is added back
        void dialog.offsetWidth;

        dialog.classList.add(ANIMATION_CLASS);
    }

    close(): void {
        this.dialogBackdrop.removeEventListener('keydown', trapFocusKeyListener);
        this.dialogBackdrop.remove();
    }
};

export default DialogBase;
