import { Day } from '../models/day.model';
import { Data } from '../models/data.model';
import { Zoom } from '../models/zoom.model';
import { Meta } from '../models/meta.model';
import { Style } from '../models/style.model';
import { Position } from '../models/position.model';
import { Activity } from '../models/activity.model';
import { Coordinate } from '../models/coordinate.model';
import { DefaultData } from '../defaults/data.default';
import { DefaultZoom } from '../defaults/zoom.default';
import { DefaultPosition } from '../defaults/position.default';
import { DefaultConstants } from '../defaults/constants.default';
import ContextMenu from './contextmenu/Contextmenu';
import Modal from './modal/Modal';
import Alert from './dialog/Alert';

// Get version information from package.json
const VERSION = require('/package.json').version;

// Reference to target element used when panning the canvas
const SCROLLABLE_TARGET = document.documentElement;

/**
 * Class to render Timeline on a HTMLCanvasElement
 */
class Timeline {
    // Internal Timeline properties
    private canvas: HTMLCanvasElement;
    private contextmenu: ContextMenu;
    private meta: Meta;
    private style: Style;
    private days: Day[];
    private zoom: Zoom;
    private isDragging: boolean;
    private dragPosition: Position;
    private filename: string;

    // Intermittent event listeners
    private mouseDragCallback: any;
    private mouseUpCallback: any;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.isDragging = false;
        this.zoom = DefaultZoom;
        this.dragPosition = DefaultPosition;
        this.contextmenu = new ContextMenu(this);

        // Set default language and style, can be overridden from the JSON-files
        this.meta = DefaultData.meta;
        this.style = DefaultData.style;

        // Disable default browser behaviour
        ['wheel', 'contextmenu'].forEach((eventName: string) => {
            document.addEventListener(eventName, this.onEventPrevent, { passive: false });
        });

        // Re-render canvas if the window is resized
        window.addEventListener('resize', this.onResize.bind(this));

        // Application specific listeners
        this.canvas.addEventListener('drop', this.onDrop.bind(this));
        this.canvas.addEventListener('click', this.onClick.bind(this));
        this.canvas.addEventListener('wheel', this.onMouseWheelZoom.bind(this));
        this.canvas.addEventListener('keydown', this.onKeyDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('contextmenu', this.onContextmenu.bind(this));

        // Prevent default drag behavior
        ['dragenter', 'dragover', 'dragleave', 'drop', 'contextmenu'].forEach((eventName: string) => {
            this.canvas.addEventListener(eventName, this.onEventPrevent);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach((eventName: string) => {
            this.canvas.addEventListener(eventName, this.highlight.bind(this));
        });

        // Remove highlight background when file leaves or is dropped
        ['dragleave', 'drop'].forEach((eventName: string) => {
            this.canvas.addEventListener(eventName, this.unhighlight.bind(this));
        });

        // Render the landing page as the default screen
        this.renderLandingPage();

        // Set focus to enable keybord inputs
        this.canvas.focus();
    }
    
    // --------------------------------------------------------------
    // Event methods
    // --------------------------------------------------------------

    /**
     * Prevent Browser default behaviour and propagation
     * @param event Event
     */
    private onEventPrevent(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
    }

    /**
     * MouseDown EventListener
     * @param event MouseEvent
     */
    private onMouseDown(event: MouseEvent): void {
        this.dragPosition = {
            left: SCROLLABLE_TARGET.scrollLeft,
            top: SCROLLABLE_TARGET.scrollTop,
            x: event.clientX,
            y: event.clientY
        };

        // Store references to these events to be able to remove them later
        this.mouseDragCallback = this.onMouseDragHandler.bind(this);
        this.mouseUpCallback = this.onMouseUpHandler.bind(this);

        this.canvas.addEventListener('mousemove', this.mouseDragCallback);
        
        // This listener must be on the document and not the canvas
        // Or it will get stuck if the mouse is moved outside the window/canvas
        document.addEventListener('mouseup', this.mouseUpCallback);
    }

    /**
     * MouseMove EventListener
     * @param event MouseEvent
     */
    private onMouseDragHandler(event: MouseEvent): void {
        this.canvas.style.cursor = 'grabbing';
        this.isDragging = true;

        // How far the mouse has been moved
        const dx = event.clientX - this.dragPosition.x;
        const dy = event.clientY - this.dragPosition.y;
        
        SCROLLABLE_TARGET.scrollLeft = this.dragPosition.left - dx;
        SCROLLABLE_TARGET.scrollTop = this.dragPosition.top - dy;
    }

    /**
     * KeyDown EventListener
     * @param event KeybordEvent
     */
    private onKeyDown(event: KeyboardEvent): void {
        if(!this.hasData()) {
            return;
        }

        const key = event.key.toLowerCase();

        const commands = {
            s: this.scrollTimeline.bind(this, 'start'),
            e: this.scrollTimeline.bind(this, 'end'),
            z: this.resetZoom.bind(this)
        };

        commands[key]?.call();
    }

    /**
     * MouseMove EventListener
     * @param event MouseEvent
     */
    private onMouseMove(event: MouseEvent): void {
        const activity = this.hitDetection(event.clientX, event.clientY);
        const cursor = activity
            ? 'pointer'
            : 'default';
        
        this.canvas.style.cursor = cursor;
    }

    /**
     * WheelEvent EventListener - Zooms and re-renders the canvas
     * @param event WheelEvent
     */
    private onMouseWheelZoom(event: WheelEvent): void {
        // Disable default vertical scroll of canvas
        event.preventDefault();
        event.stopPropagation();

        // Don't zoom the landing page and only zoom if ctrlKey is down
        if(!this.hasData() || !event.ctrlKey) {
            return;
        }

        this.zoomTimeline(event.clientX, event.clientY, event.deltaY);
    }

    /**
     * Handles all click events on the canvas
     * The coordinates are checked against the plotted activities to display modal window for the correct activity
     * @param event Browser DragEvent
     */
    private onClick(event: MouseEvent): void {
        this.contextmenu.hide();

        // Check if the canvas was dragged
        // If so reset the bit and exit this event since it was not intended as a click on an activity
        if(this.isDragging) {
            this.isDragging = false;
            return;
        }

        const activity = this.hitDetection(event.clientX, event.clientY);
        if(activity) {
            const title = `
                <span style="
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    margin-right: 0.5rem;
                    flex-shrink: 0;
                    background-color: ${activity.fillColor};
                    border: 2px solid ${activity.strokeColor};
                "></span>
                ${activity.title}
            `;

            const content = `
                <p>${activity.description}</p>
                <p>${activity.timestamp.toLocaleString(this.meta.locale)}</p>
            `;

            const modal = new Modal(title, content);
        }
    }

    /**
     * MouseUp EventListener
     */
    private onMouseUpHandler(): void {
        this.canvas.removeEventListener('mousemove', this.mouseDragCallback);

        // This listener must be on the document and not the canvas
        // Or it will get stuck if the mouse is moved outside the window/canvas
        document.removeEventListener('mouseup', this.mouseUpCallback);

        this.canvas.style.cursor = 'default';
    }

    /**
     * When a file is dropped on the canvas
     * @param event Browser DragEvent
     */
    private onDrop(event: DragEvent): void{
        const dataTransfer = event.dataTransfer;
        const files = dataTransfer!.files;
    
        // Can only parse and display one file at the time
        // Take the first file that was dropped
        const firstFile = <File>files.item(0);
        this.filename = firstFile.name.substring(0, firstFile.name.lastIndexOf('.')) || firstFile.name;
        this.parseFile(firstFile);
    }

    /**
    * Triggered by event when the window is resized
    */
    private onResize(): void {
        if(this.hasData()) {
            this.render();
        }else {
            this.renderLandingPage();
        }
    }

    /**
     * Contextmenu event to show the custom contextmenu
     * @param event MouseEvent
     */
    private onContextmenu(event: MouseEvent): void {
        if(this.hasData()) {
            this.contextmenu.show(event);
        }
    }

    // --------------------------------------------------------------
    // Logical methods
    // --------------------------------------------------------------

    /**
     * Callback function from Contextmenu - Exports Timeline as PNG
     * @param x X-coordinate from contextmenu - not used
     * @param y Y-coordinate from contextmenu - not used
     */
    contextmenuOnExportPNG(x: number, y: number): void {
        const dataURL = this.canvas.toDataURL('image/png', 1.0);

        const download = document.createElement('a');
        download.href = dataURL;
        download.download = this.filename + '.png';
        document.body.appendChild(download);
        download.click();
        document.body.removeChild(download);
    }

    /**
     * Callback function from Contextmenu - Displays About information
     * @param x X-coordinate from contextmenu - not used
     * @param y Y-coordinate from contextmenu - not used
     */
    contextmenuOnAbout(x: number, y: number): void {
        const aboutAlert = new Alert(`
            <h3 class="at-m-0">Version ${VERSION}</h3>
            <p>Developed by Qulle <a href="https://github.com/qulle/activity-timeline" target="_blank" class="at-link">github.com/qulle/activity-timeline</a></p>
        `);
    }

    /**
     * Callback function from Contextmenu - Zooms in
     * @param mouseX X-coordinate used to control where to focus the zoom
     * @param mouseY Y-coordinate used to control where to focus the zoom
     */
    contextmenuOnZoomIn(mouseX: number, mouseY: number): void {
        this.zoomTimeline(mouseX, mouseY, -1);
    }

    /**
     * Callback function from Contextmenu - Zooms out
     * @param mouseX X-coordinate used to control where to focus the zoom
     * @param mouseY Y-coordinate used to control where to focus the zoom
     */
    contextmenuOnZoomOut(mouseX: number, mouseY: number): void {
        this.zoomTimeline(mouseX, mouseY, 1);
    }

    /**
     * Zoom in or out at a given X, Y coordinate
     * @param deltaY Positive value = Zoom in, Negative value = Zoom out
     */
    private zoomTimeline(mouseX: number, mouseY: number, deltaY: number): void {
        // The sign needs to be flip or the scrolling will be inverted from what user expects
        const flipSign = -1;
        const direction = Math.sign(deltaY) * flipSign;

        let referenceZoomPoint: Coordinate = {
            x: (mouseX + SCROLLABLE_TARGET.scrollLeft) / this.zoom.value, 
            y: (mouseY + SCROLLABLE_TARGET.scrollTop) / this.zoom.value
        };

        this.zoom.value += direction * this.zoom.factor * this.zoom.value;

        // Keep the zoom-value in the range min, max given in the zoom object
        this.zoom.value = Math.max(
            this.zoom.min, 
            Math.min(
                this.zoom.max, 
                this.zoom.value
            )
        );
        
        let targetZoomPoint: Coordinate = {
            x: referenceZoomPoint.x * this.zoom.value - mouseX,
            y: referenceZoomPoint.y * this.zoom.value - mouseY
        };

        // Render the Timeline with the new zoom
        this.render();
        
        // Scroll target area in to view (where the mouse is placed when zooming)
        SCROLLABLE_TARGET.scrollLeft = targetZoomPoint.x;
        SCROLLABLE_TARGET.scrollTop = targetZoomPoint.y;
    }

    /**
     * Scroll Timeline to vertical center and horizontal discrete location
     * @param inline 'center' | 'end' | 'nearest' | 'start'
     */
    private scrollTimeline(inline: ScrollLogicalPosition): void {
        this.canvas.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: inline
        });
    }

    /**
     * Resets zoom level to standard and re-renders Timeline
     */
    private resetZoom(): void {
        this.zoom.value = 1;
        this.render();
    }

    /**
     * Highlight drop area when item is dragged over it
     */
    private highlight(): void {
        this.canvas.classList.add(DefaultConstants.highlightClass);
    }

    /**
     * Remove highlight background when file leaves or is dropped
     */
    private unhighlight(): void {
        this.canvas.classList.remove(DefaultConstants.highlightClass);
    }

    /**
     * Parse the given file that was dropped and render the Timeline
     * @param file The file that was dropped
     */
    private parseFile(file: File): void {
        const self = this;
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onloadend = function() {
            let currentDate: string;

            try {
                // Parse the JSON-file and convert date and timestamps to date objects using the reviever function
                const data = JSON.parse(<string>reader.result, function(key, value) {
                    if(key === 'date') {
                        currentDate = value;
                        value = new Date(value);
                    }else if(key === 'timestamp') {
                        value = new Date(currentDate + ' ' + value);
                    }

                    return value;
                });

                self.setData(data);
                self.render();

                // Scroll last day into viewport
                self.scrollTimeline('end');
            }catch(error: any) {
                const parseAlert = new Alert(`
                    <h3 class="at-m-0">Oops!</h3>
                    <p>Error parsing the JSON file, check the syntax!</p>
                `);
            }
        }
    }

    /**
     * Check if the data array has data to render
     * @returns True if array holds data, False otherwise
     */
    private hasData(): boolean {
        return Array.isArray(this.days) && this.days.length > 0;
    }

    /**
     * Calculates the width of the canvas base on the data to be rendered
     * @returns Width of the canvas, minimum width is the window.innerWidth
     */
    private calculateWidth(): number {
        // window.innerWidth is the minimum width of the canvas
        let width = window.innerWidth;

        const calculatedWidth = DefaultConstants.xPadding * (this.zoom.value > 1 ? this.zoom.value : 1) + (DefaultConstants.stepDistanceXAxis * DefaultConstants.amplification * this.days.length * this.zoom.value);

        if(calculatedWidth > width) {
            width = calculatedWidth;
        }

        return width;
    }

    /**
     * Calculates the height of the canvas base on the data to be rendered
     * @returns Height of the canvas, minimum height is the window.innerHeight
     */
    private calculateHeight(): number {
        // window.innerHeight is the minimum height of the canvas
        let height = window.innerHeight;
        let maxActivitiesOnYAxis = 0;

        // Find the day with most activites to be rendered on the Y-axis
        this.days.forEach(day => {
            if(day.activities.length > maxActivitiesOnYAxis) {
                maxActivitiesOnYAxis = day.activities.length;
            } 
        });

        // Calculate appropriate height
        const calculatedHeight = DefaultConstants.yPadding * (this.zoom.value > 1 ? this.zoom.value : 1) + (DefaultConstants.stepDistanceYAxis * maxActivitiesOnYAxis * 2 * this.zoom.value);

        if(calculatedHeight > height) {
            height = calculatedHeight;
        }

        return height;
    }

    /**
     * Calculates the Y-coordinate for where to render the X-axis
     * @returns Y-coordinate for where to render the X-axis
     */
    private getVerticalMid(): number {
        return (this.canvas.height / 2 - this.style.lineThickness / 2) / this.zoom.value;
    }

    /**
     * Check if date is todays date
     * @param date Value to be checked
     * @returns True if date is today otherwise False
     */
    private isToday(date: Date): boolean {
        const now = new Date();

        return date.getFullYear() === now.getFullYear() &&
               date.getMonth()    === now.getMonth()    && 
               date.getDate()     === now.getDate();
    }

    /**
     * Gets the long version of weekday from a given date
     * @param date Value to be converted to weekday
     * @returns Weekday in format [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
     */
    private getWeekDayName(date: Date): string {
        // Translate date to weekday name
        const weekDay = date.toLocaleString(this.meta.locale, { weekday: 'long' });
        
        // Make the first letter capialized
        return weekDay.charAt(0).toUpperCase() + weekDay.slice(1);
    }

    /**
     * Checks direction to render activities on the Y-axis
     * @param index Iterator-index from loop
     * @returns True if rendering towards top, False if towards bottom
     */
    private isTop(index: number): boolean {
        return index % 2 === 0;
    }

    /**
     * Get the Activity that corresponds to the clicked location in the canvas
     * @param x X-coordinate
     * @param y Y-coordinate
     * @returns The clicked Activity, undefined if no activity is found
     */
    private hitDetection(x: number, y: number): Activity | undefined {
        if(!this.hasData()) {
            return undefined;
        }

        // The coordinates must be translated to accommodate for scrolling in the canvas
        const rect = this.canvas.getBoundingClientRect();
        const relX = (x - rect.left) / this.zoom.value;
        const relY = (y - rect.top) / this.zoom.value;

        // How far the detection will be checked away from the clicked coordinate
        const tolerance = DefaultConstants.radius;

        // Perform collision detection
        for(let a = 0; a < this.days.length; a++) {
            for(let b = 0; b < this.days[a].activities.length; b++) {
                const activity = this.days[a].activities[b];
                if(
                    activity.x >= (relX - tolerance) && 
                    activity.x <= (relX + tolerance) &&
                    activity.y >= (relY - tolerance) && 
                    activity.y <= (relY + tolerance)
                ) {
                    return activity;
                }
            }
        }

        return undefined;
    }

    /**
     * Sets the data to be rendered on the Timeline
     * Sorts both days and activites in ascending order
     * @param data Array of days to be rendered
     */
    setData(data: Data): void {
        // Override default data with data from the JSON-file
        this.meta = { ...DefaultData.meta, ...data.meta };
        this.style = { ...DefaultData.style, ...data.style };
        this.days = [ ...DefaultData.days, ...data.days ];

        // Sort days in ascending order
        this.days.sort((left, right) => {
            return left.date.getTime() - right.date.getTime();
        });

        // Sort activities in each day in ascending order
        this.days.forEach(day => {
            day.activities.sort((left, right) => {
                return left.timestamp.getTime() - right.timestamp.getTime();
            });
        });

        if(this.meta.version !== VERSION) {
            const versionAlert = new Alert(`
                <h3 class="at-m-0">Possibly version mismatch</h3>
                <p>Application version <strong>v${VERSION}</strong> and JSON version <strong>v${this.meta.version}</strong></p>
            `);
        }
    }

    // --------------------------------------------------------------
    // Render methods
    // --------------------------------------------------------------

    /**
     * Renders a circle in the canvas at a given coordinate
     * @param ctx HTMLCanvas 2d-context
     * @param x X-coordinate 
     * @param y Y-cordinate
     * @param radius Radius of the circle
     * @param fillColor Fillcolor of the circle
     * @param strokeColor Strokecolor of the circle
     */
    private renderCircle(
        ctx: CanvasRenderingContext2D, 
        x: number, 
        y: number, 
        radius: number, 
        fillColor: string, 
        strokeColor: string
    ): void {
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }

    /**
     * Renders the landing page when the app is first started
     */
    renderLandingPage(): void {
        // Context to render elements on
        const ctx = <CanvasRenderingContext2D>this.canvas.getContext('2d');

        // Default canvas size same as window
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Clear the canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate appropriate dimensions for the drop square
        const dropSquareWidth = window.innerWidth < DefaultConstants.ladingPageWidth + DefaultConstants.canvasInternalPadding 
            ? 0.9 * window.innerWidth 
            : DefaultConstants.ladingPageWidth;

        const dropSquareHeight = window.innerHeight < DefaultConstants.ladingPageHeight + DefaultConstants.canvasInternalPadding 
            ? 0.9 * window.innerHeight 
            : DefaultConstants.ladingPageHeight;

        // Render drop square
        ctx.fillStyle = '#E9E9E9';
        ctx.lineWidth = this.style.lineThickness;
        ctx.strokeStyle = this.style.strokeColor;
        ctx.setLineDash([6]);
        ctx.fillRect(
            window.innerWidth / 2 - dropSquareWidth / 2,
            window.innerHeight / 2 - dropSquareHeight / 1.8,
            dropSquareWidth,
            dropSquareHeight
        );
        ctx.strokeRect(
            window.innerWidth / 2 - dropSquareWidth / 2,
            window.innerHeight / 2 - dropSquareHeight / 1.8,
            dropSquareWidth, 
            dropSquareHeight
        );

        // Note: The Path2D SVG is generated for size 100 * 76
        const dropIconDimensions = { width: 100, height: 76 };
        const dropIconSVGPath = new Path2D('M37.5 21.875C37.5 19.3886 38.4877 17.004 40.2459 15.2459C42.004 13.4877 44.3886 12.5 46.875 12.5H53.125C55.6114 12.5 57.996 13.4877 59.7541 15.2459C61.5123 17.004 62.5 19.3886 62.5 21.875V28.125C62.5 30.6114 61.5123 32.996 59.7541 34.7541C57.996 36.5123 55.6114 37.5 53.125 37.5V43.75H87.5C88.3288 43.75 89.1237 44.0792 89.7097 44.6653C90.2958 45.2513 90.625 46.0462 90.625 46.875V53.125C90.625 53.9538 90.2958 54.7487 89.7097 55.3347C89.1237 55.9208 88.3288 56.25 87.5 56.25C86.6712 56.25 85.8763 55.9208 85.2903 55.3347C84.7042 54.7487 84.375 53.9538 84.375 53.125V50H53.125V53.125C53.125 53.9538 52.7958 54.7487 52.2097 55.3347C51.6237 55.9208 50.8288 56.25 50 56.25C49.1712 56.25 48.3763 55.9208 47.7903 55.3347C47.2042 54.7487 46.875 53.9538 46.875 53.125V50H15.625V53.125C15.625 53.9538 15.2958 54.7487 14.7097 55.3347C14.1237 55.9208 13.3288 56.25 12.5 56.25C11.6712 56.25 10.8763 55.9208 10.2903 55.3347C9.70424 54.7487 9.375 53.9538 9.375 53.125V46.875C9.375 46.0462 9.70424 45.2513 10.2903 44.6653C10.8763 44.0792 11.6712 43.75 12.5 43.75H46.875V37.5C44.3886 37.5 42.004 36.5123 40.2459 34.7541C38.4877 32.996 37.5 30.6114 37.5 28.125V21.875ZM0 71.875C0 69.3886 0.98772 67.004 2.74587 65.2459C4.50403 63.4877 6.8886 62.5 9.375 62.5H15.625C18.1114 62.5 20.496 63.4877 22.2541 65.2459C24.0123 67.004 25 69.3886 25 71.875V78.125C25 80.6114 24.0123 82.996 22.2541 84.7541C20.496 86.5123 18.1114 87.5 15.625 87.5H9.375C6.8886 87.5 4.50403 86.5123 2.74587 84.7541C0.98772 82.996 0 80.6114 0 78.125L0 71.875ZM37.5 71.875C37.5 69.3886 38.4877 67.004 40.2459 65.2459C42.004 63.4877 44.3886 62.5 46.875 62.5H53.125C55.6114 62.5 57.996 63.4877 59.7541 65.2459C61.5123 67.004 62.5 69.3886 62.5 71.875V78.125C62.5 80.6114 61.5123 82.996 59.7541 84.7541C57.996 86.5123 55.6114 87.5 53.125 87.5H46.875C44.3886 87.5 42.004 86.5123 40.2459 84.7541C38.4877 82.996 37.5 80.6114 37.5 78.125V71.875ZM75 71.875C75 69.3886 75.9877 67.004 77.7459 65.2459C79.504 63.4877 81.8886 62.5 84.375 62.5H90.625C93.1114 62.5 95.496 63.4877 97.2541 65.2459C99.0123 67.004 100 69.3886 100 71.875V78.125C100 80.6114 99.0123 82.996 97.2541 84.7541C95.496 86.5123 93.1114 87.5 90.625 87.5H84.375C81.8886 87.5 79.504 86.5123 77.7459 84.7541C75.9877 82.996 75 80.6114 75 78.125V71.875Z');

        // Render drop text
        const dropLabel = 'DROP TIMELINE JSON { }';
        ctx.font = `italic bold 20px Arial`;
        ctx.fillStyle = this.style.textColor;
        ctx.fillText(
            dropLabel, 
            window.innerWidth / 2 - ctx.measureText(dropLabel).width / 2,
            window.innerHeight / 2 + dropIconDimensions.height / 2,
        );

        // Render version text
        const versionLabel = 'Version ' + VERSION;
        ctx.font = `italic 14px Arial`;
        ctx.fillText(
            versionLabel, 
            window.innerWidth / 2 - ctx.measureText(versionLabel).width / 2,
            window.innerHeight / 2 + dropIconDimensions.height / 2 + 20,
        );

        // Render drop icon
        ctx.translate(
            (window.innerWidth / 2) - dropIconDimensions.width / 2, 
            (window.innerHeight / 2) - dropIconDimensions.height - 20
        );
        ctx.fill(dropIconSVGPath);
    }

    /**
     * Renders the Timeline on the canvas based on the given data
     */
    render(): void {
        // Context to render elements on
        const ctx = <CanvasRenderingContext2D>this.canvas.getContext('2d');

        // Set canvas width and height based no the data
        this.canvas.width = this.calculateWidth();
        this.canvas.height = this.calculateHeight();

        // Clear the canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Canvas background
        ctx.fillStyle = this.style.backgroundColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Note: This will affect all things that are drawn. 
        // In some places values must be corrected by multiplying or dividing with the zoom.value
        ctx.scale(this.zoom.value, this.zoom.value);

        // Get the mid of the canvas, must come after the calculate width/height
        const mid = this.getVerticalMid();

        // Default style
        ctx.font = `bold ${this.style.fontSize}px Arial`;
        ctx.strokeStyle = this.style.timelineStrokeColor;
        ctx.lineWidth = this.style.lineThickness;
        ctx.lineCap = <CanvasLineCap>'round';

        // Render main Timeline
        ctx.beginPath();
        ctx.moveTo(DefaultConstants.canvasInternalPadding, mid);
        ctx.lineTo(this.canvas.width / this.zoom.value - DefaultConstants.canvasInternalPadding, mid);
        ctx.stroke();

        // Render each day on Timeline
        this.days.forEach((day, index) => {
            const x = DefaultConstants.xPadding + (DefaultConstants.stepDistanceXAxis * DefaultConstants.amplification * index);
            const y = mid;

            // If placement is top or bottom direction on the Y-axis
            const sign = this.isTop(index) 
                ? 1 
                : -1;

            // Adjust for the text height on top positioned text
            const signAdjustment = !this.isTop(index) 
                ? this.style.fontSize / 2 
                : 0;

            // Render day Timeline
            ctx.strokeStyle = this.style.timelineStrokeColor;
            ctx.beginPath();
            ctx.setLineDash([5, 8]);
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + (day.activities.length * DefaultConstants.stepDistanceYAxis * -sign));
            ctx.stroke();
            ctx.setLineDash([]);

            // Render activities from that day
            day.activities.forEach((activity, index) => {
                // Render activity-circle
                const posX = x;
                const posY = y + DefaultConstants.stepDistanceYAxis * (index + 1) * -sign;
                this.renderCircle(
                    ctx, 
                    posX, 
                    posY, 
                    DefaultConstants.radius, 
                    activity.fillColor, 
                    activity.strokeColor 
                );

                // Store coordinates where the activity was rendered, this will be used in the click-event
                activity.x = posX;
                activity.y = posY;

                // Render activity-label
                ctx.fillStyle = this.style.textColor;
                ctx.fillText(
                    activity.title, 
                    x + DefaultConstants.radius * 1.5, 
                    y + DefaultConstants.stepDistanceYAxis * (index + 1) * -sign - 10 + this.style.fontSize / 2
                );
                ctx.fillText(
                    activity.timestamp.toLocaleTimeString(this.meta.locale), 
                    x + DefaultConstants.radius * 1.5, 
                    y + DefaultConstants.stepDistanceYAxis * (index + 1) * -sign + 8 + this.style.fontSize / 2
                );
            });

            // Render date-circle on Timeline
            this.renderCircle(
                ctx, 
                x, 
                y, 
                DefaultConstants.radius, 
                this.style.fillColor, 
                this.style.strokeColor
            );

            // Render date-label
            const dateLabel = this.isToday(day.date) 
                ? day.date.toLocaleDateString(this.meta.locale) + ' (Today)' 
                : day.date.toLocaleDateString(this.meta.locale) + ' (' + this.getWeekDayName(day.date) + ')';
            ctx.fillStyle = this.style.textColor;
            ctx.fillText(
                dateLabel, 
                x - ctx.measureText(dateLabel).width / 2, 
                y + signAdjustment + DefaultConstants.radius * 2 * sign
            );
        });
    }
};

export default Timeline;
