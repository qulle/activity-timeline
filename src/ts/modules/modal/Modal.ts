import ModalBase from './ModalBase';

class Modal extends ModalBase {
    constructor(title: string, content: string) {
        super(title);
    
        const modalContent = document.createElement('div');
        modalContent.className = 'at-modal__content';
        modalContent.innerHTML = content;

        this.show(modalContent);
    }
}

export default Modal;
