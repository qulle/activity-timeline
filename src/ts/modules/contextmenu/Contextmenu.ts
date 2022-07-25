import Timeline from '../Timeline';
import { trapFocusKeyListener } from '../helpers/TrapFocus';
import { getIcon, SVGPaths } from '../helpers/Icons';

class ContextMenu {
    private timeline: Timeline;
    private menu: HTMLUListElement;

    constructor(timeline: Timeline) {
        this.timeline = timeline;
        this.create();
    }

    create() {
        // Create root <ul>
        this.menu = document.createElement('ul');
        this.menu.className = 'at-context-menu';
        this.menu.setAttribute('tabindex', '-1');
        this.menu.addEventListener('keydown', trapFocusKeyListener);

        // Create menu items
        this.addMenuItem('Export as PNG', this.timeline.contextmenuOnExportPNG.bind(this.timeline),
            getIcon({
                path: SVGPaths.Export, 
                fill: 'currentColor', 
                stroke: 'none'
            })
        );

        this.addMenuItem('Zoom in', this.timeline.contextmenuOnZoomIn.bind(this.timeline),
            getIcon({
                path: SVGPaths.ZoomIn, 
                fill: 'currentColor', 
                stroke: 'none'
            })
        );

        this.addMenuItem('Zoom out', this.timeline.contextmenuOnZoomOut.bind(this.timeline),
            getIcon({
                path: SVGPaths.ZoomOut, 
                fill: 'currentColor', 
                stroke: 'none'
            })
        );

        this.addMenuItem('About', this.timeline.contextmenuOnAbout.bind(this.timeline),
            getIcon({
                path: SVGPaths.GitHub, 
                fill: 'currentColor', 
                stroke: 'none'
            }),
        );

        document.body.appendChild(this.menu);
    }

    addMenuItem(name: string, callback: any, svg: string) {
        const li = document.createElement('li');

        li.className = 'at-context-menu__item';
        li.textContent = name;
        li.setAttribute('tabindex', '0');
        li.addEventListener('click', () => {
            this.hide();
            callback();
        });
        li.addEventListener('keyup', (event) => {
            if(event.key.toLowerCase() === 'enter') {
                this.hide();
                callback(); 
            }
        });

        const icon = document.createElement('span');
        icon.className = 'at-context-menu__icon';
        icon.innerHTML = svg;
        li.insertAdjacentElement('afterbegin', icon);

        this.menu.appendChild(li);
    }

    show(event: MouseEvent) {
        this.menu.style.left = `${event.clientX}px`;
        this.menu.style.top = `${event.clientY}px`;
        this.menu.classList.add('at-context-menu--show');
        this.menu.focus();
    }

    hide() {
        this.menu.classList.remove('at-context-menu--show');
    }
}

export default ContextMenu;
