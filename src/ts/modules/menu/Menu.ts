import Timeline from '../Timeline';
import { getIcon, SVGPaths } from '../helpers/Icons';

class Menu {
    private timeline: Timeline;
    private menu: HTMLDivElement;

    constructor(timeline: Timeline) {
        this.timeline = timeline;
        this.create();
    }

    create(): void {
        // Create menu element
        this.menu = document.createElement('div');
        this.menu.className = 'at-menu';

        [
            {
                title: 'Landing Page',
                callback: this.timeline.menuOnLandingPage.bind(this.timeline),
                svg: SVGPaths.Logo
            },
            {
                title: 'Current Timeline',
                callback: this.timeline.menuOnInfo.bind(this.timeline),
                svg: SVGPaths.Info
            },
            {
                title: 'Align Start',
                callback: this.timeline.menuOnAlignStart.bind(this.timeline),
                svg: SVGPaths.AlignStart
            },
            {
                title: 'Align Center',
                callback: this.timeline.menuOnAlignCenter.bind(this.timeline),
                svg: SVGPaths.AlignCenter
            },
            {
                title: 'Align End',
                callback: this.timeline.menuOnAlignEnd.bind(this.timeline),
                svg: SVGPaths.AlignEnd
            },
            {
                title: 'Reset Zoom',
                callback: this.timeline.menuOnZoomReset.bind(this.timeline),
                svg: SVGPaths.ZoomReset
            },
            {
                title: 'Zoom Out',
                callback: this.timeline.menuOnZoomDelta.bind(this.timeline, -1),
                svg: SVGPaths.ZoomOut
            },
            {
                title: 'Zoom In',
                callback: this.timeline.menuOnZoomDelta.bind(this.timeline, 1),
                svg: SVGPaths.ZoomIn
            },
            {
                title: 'Export PNG',
                callback: this.timeline.menuOnExportPNG.bind(this.timeline),
                svg: SVGPaths.Export
            },
            {
                title: 'Upload Timeline Data',
                callback: this.timeline.menuOnDataImport.bind(this.timeline),
                svg: SVGPaths.Upload
            },
            {
                title: 'About',
                callback: this.timeline.menuOnAbout.bind(this.timeline),
                svg: SVGPaths.About
            },
            {
                title: 'Toggle Menu',
                callback: this.toggleMenuStrip.bind(this),
                svg: SVGPaths.Menu,
                className: 'at-menu__item-toggle'
            }
        ].forEach(menuItem => {
            this.addMenuItem(
                menuItem.title,
                menuItem.callback, 
                menuItem.svg,
                menuItem.className
            );
        });

        document.body.appendChild(this.menu);
    }

    toggleMenuStrip(): void {
        const children = [...this.menu.children];
        const targetChildren = children.filter(child => {
            return !child.classList.contains('at-menu__item-toggle');
        });

        targetChildren.forEach(child => {
            child.classList.toggle('at-d-none');
        });
    }

    addMenuItem(title: string, callback: any, svg: string, className: string = ''): void {
        const button = document.createElement('button');
        button.className = `at-btn at-btn--blue-mid at-btn--round at-menu__item ${className}`;
        button.title = title;
        button.innerHTML = getIcon({
            path: svg, 
            fill: 'currentColor', 
            stroke: 'none',
            width: 20,
            height: 20
        });
        button.addEventListener('click', () => {
            callback.call();
        });
        button.addEventListener('keyup', (event) => {
            if(event.key.toLowerCase() === 'enter') {
                callback.call();
            }
        });

        this.menu.appendChild(button);
    }
};

export default Menu;
