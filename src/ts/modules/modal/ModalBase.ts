import { trapFocusKeyListener } from '../helpers/TrapFocus';
import { getIcon, SVGPaths } from '../helpers/Icons';

const ANIMATION_CLASS = 'at-animations--bounce';

class ModalBase {
    private modalBackdrop: HTMLDivElement;
    private modal: HTMLDivElement;

    constructor(title: string) {
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'at-modal-backdrop at-modal-backdrop--fixed';
        modalBackdrop.setAttribute('tabindex', '-1');
        modalBackdrop.addEventListener('keydown', trapFocusKeyListener);
        modalBackdrop.addEventListener('click', this.bounceAnimation.bind(this));

        const modal = document.createElement('div');
        modal.className = 'at-modal at-animations--bounce';

        const modalHeader = document.createElement('div');
        modalHeader.className = 'at-modal__header';

        const modalTitle = document.createElement('h3');
        modalTitle.className = 'at-modal__title';
        modalTitle.innerHTML = title;

        const modalClose = document.createElement('button');
        modalClose.setAttribute('type', 'button');
        modalClose.className = 'at-modal__close at-btn at-btn--blank';
        modalClose.innerHTML = getIcon({
            path: SVGPaths.Close, 
            fill: 'none', 
            stroke: 'currentColor'
        });
        modalClose.addEventListener('click', (event) => {
            event.preventDefault();
            this.close();
        });

        modalBackdrop.appendChild(modal);
        modal.appendChild(modalHeader);
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(modalClose);

        this.modalBackdrop = modalBackdrop;
        this.modal = modal;

        window.addEventListener('keyup', (event) => {
            if(event.key.toLowerCase() === 'escape') {
                this.close();
            }
        });
    }

    private bounceAnimation(event: MouseEvent): void {
        // To prevent trigger the animation if clicked in the modal and not the backdrop
        if(event.target !== this.modalBackdrop) {
            return;
        }

        this.modal.classList.remove(ANIMATION_CLASS);

        // Trigger reflow of DOM, reruns animation when class is added back
        void this.modal.offsetWidth;

        this.modal.classList.add(ANIMATION_CLASS);
    }

    show(modalContent: HTMLDivElement): void {
        this.modal.appendChild(modalContent);
        document.body.appendChild(this.modalBackdrop);
        this.modalBackdrop.focus();
    }

    close(): void {
        this.modalBackdrop.removeEventListener('keydown', trapFocusKeyListener);
        this.modalBackdrop.remove();
    }
};

export default ModalBase;
