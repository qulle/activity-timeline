import { trapFocus } from '../helpers/TrapFocus';

const ANIMATION_CLASS = 'at-animations--bounce';

class DialogBase {
    protected dialogBackdrop: HTMLDivElement;

    constructor() {
        const dialogBackdrop = document.createElement('div');
        dialogBackdrop.className = 'at-dialog-backdrop at-dialog-backdrop--fixed';
        dialogBackdrop.setAttribute('tabindex', '-1');
        dialogBackdrop.addEventListener('keydown', trapFocus);
        dialogBackdrop.addEventListener('click', this.bounceAnimation.bind(this));

        this.dialogBackdrop = dialogBackdrop;

        window.addEventListener('keyup', (event) => {
            if(event.key.toLowerCase() === 'escape') {
                this.close();
            }
        });
    }

    private isSelf(event: MouseEvent): boolean {
        return event.target !== this.dialogBackdrop;
    }

    private runAnimation(): void {
        const dialog = this.dialogBackdrop.firstElementChild as HTMLDivElement;

        dialog.classList.remove(ANIMATION_CLASS);
        void dialog.offsetWidth;
        dialog.classList.add(ANIMATION_CLASS);
    }

    private bounceAnimation(event: MouseEvent): void {
        if(this.isSelf(event)) {
            return;
        }

        this.runAnimation();
    }

    close(): void {
        this.dialogBackdrop.removeEventListener('keydown', trapFocus);
        this.dialogBackdrop.remove();
    }
};

export default DialogBase;
