import DialogBase from './DialogBase';

class Alert extends DialogBase {
    constructor(
        content: string
    ) {
        super();

        const dialog = document.createElement('div');
        dialog.className = 'at-dialog at-dialog--alert at-animations--bounce';
        dialog.innerHTML = content;

        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'at-dialog__button-wrapper';

        const okButton = document.createElement('button');
        okButton.setAttribute('type', 'button');
        okButton.className = 'at-dialog__btn at-btn at-btn--blue-mid';
        okButton.innerText = 'Got it!';
        okButton.addEventListener('click', (event) => {
            this.close();
        });

        buttonWrapper.appendChild(okButton);
        dialog.appendChild(buttonWrapper);

        this.dialogBackdrop.appendChild(dialog);
        document.body.appendChild(this.dialogBackdrop);
        this.dialogBackdrop.focus();
    }
};

export { Alert };
