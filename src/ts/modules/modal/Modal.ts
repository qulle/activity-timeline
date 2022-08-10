import ModalBase from './ModalBase';

class Modal extends ModalBase {
    private modalContent: HTMLDivElement;

    constructor(title: string, content: string) {
        super(title);
    
        const modalContent = document.createElement('div');
        modalContent.className = 'at-modal__content';
        modalContent.innerHTML = content;

        this.modalContent = modalContent;
        this.show(modalContent);
    }

    setModalContent(content: string): void {
        this.modalContent.innerHTML = content;
    }
};

export default Modal;
