import { Day } from '../models/day.model';
import { Data } from '../models/data.model';
import { Zoom } from '../models/zoom.model';
import { Meta } from '../models/meta.model';
import { Style } from '../models/style.model';
import { Position } from '../models/position.model';
import { Activity } from '../models/activity.model';
import { FileData } from '../models/filedata.model';
import { Coordinate } from '../models/coordinate.model';
import { DefaultData } from '../defaults/data.default';
import { DefaultZoom } from '../defaults/zoom.default';
import { DefaultPosition } from '../defaults/position.default';
import { DefaultConstants } from '../defaults/constants.default';
import { ScrollPosition } from '../types/scroll-position.type';
import { download } from './helpers/Download';
import Modal from './modal/Modal';
import Alert from './dialog/Alert';
import Menu from './menu/menu';

// Third party CSV parser
import Papa from 'papaparse';

// Get version information from package.json
const VERSION = require('/package.json').version;

// Reference to target element used when panning the canvas
const SCROLLABLE_TARGET = document.documentElement;

// Canvas needs to factor in the device resolution in order to look sharp on high-res retina screens/mobile devices etc.
const DEVICE_PIXEL_RATIO = window.devicePixelRatio || 1;

// URL to the raw GitHub JSON object containing information from the developer
const NOTIFICATION_URL = 'https://raw.githubusercontent.com/qulle/notification-endpoints/main/endpoints/activity-timeline.json';

/**
 * Class to render Timeline on a HTMLCanvasElement
 */
class Timeline {
    // Internal Timeline properties
    private canvas: HTMLCanvasElement;
    private menu: Menu;
    private meta: Meta;
    private style: Style;
    private days: Day[];
    private zoom: Zoom;
    private isDragging: boolean;
    private dragPosition: Position;
    private fileData: FileData;

    // Intermittent event listeners
    private canvasMouseMoveCallback: EventListener;
    private canvasMouseUpCallback: EventListener;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.isDragging = false;
        this.zoom = DefaultZoom;
        this.dragPosition = DefaultPosition;
        this.menu = new Menu(this);

        // Set default language and style, can be overridden from the JSON/CSV-files
        this.meta  = DefaultData.meta;
        this.style = DefaultData.style;

        // Disable default browser behaviour
        ['wheel', 'dragenter', 'dragover', 'dragleave', 'drop', 'contextmenu', 'mousedown'].forEach((eventName: string) => {
            document.addEventListener(eventName, this.onEventPrevent, { passive: false });
        });

        // Can't disable default keydown completely or F5, F12, Arrow keys etc won't work 
        document.addEventListener('keydown', this.onKeyDown);

        // Re-render canvas if the window is resized
        window.addEventListener('resize', this.onResize.bind(this));

        // Application specific listeners
        this.canvas.addEventListener('drop', this.onCanvasDrop.bind(this));
        this.canvas.addEventListener('click', this.onCanvasClick.bind(this));
        this.canvas.addEventListener('wheel', this.onCanvasWheel.bind(this));
        this.canvas.addEventListener('keydown', this.onCanvasKeyDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onCanvasMouseMove.bind(this));
        this.canvas.addEventListener('mousedown', this.onCanvasMouseDown.bind(this));

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
        // Note: The HTML Canvas element must have tabindex="0" attribute or focus/keyboard input won't work
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
     * KeyDown EventListener - Disable default browser zoom
     * Can't disable default keydown completely or F5, F12, Arrow keys etc won't work 
     * @param event KeybordEvent
     */
    private onKeyDown(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        if((event.ctrlKey || event.metaKey) && (
            key === '+' ||
            key === '-'
        )) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    /**
     * MouseDown EventListener
     * @param event MouseEvent
     */
    private onCanvasMouseDown(event: MouseEvent): void {
        this.canvas.focus();

        this.dragPosition = {
            left: SCROLLABLE_TARGET.scrollLeft,
            top: SCROLLABLE_TARGET.scrollTop,
            x: event.clientX,
            y: event.clientY
        };

        // Store references to these events to be able to remove them later
        this.canvasMouseMoveCallback = this.onCanvasMouseDrag.bind(this);
        this.canvasMouseUpCallback = this.onCanvasMouseUp.bind(this);

        this.canvas.addEventListener('mousemove', this.canvasMouseMoveCallback);
        
        // This listener must be on the document and not the canvas
        // Or it will get stuck if the mouse is moved outside the window/canvas
        document.addEventListener('mouseup', this.canvasMouseUpCallback);
    }

    /**
     * MouseMove EventListener
     * @param event MouseEvent
     */
    private onCanvasMouseDrag(event: MouseEvent): void {
        this.canvas.style.cursor = 'grabbing';
        this.isDragging = true;

        // How far the mouse has been moved
        const dx = event.clientX - this.dragPosition.x;
        const dy = event.clientY - this.dragPosition.y;
        
        SCROLLABLE_TARGET.scrollLeft = this.dragPosition.left - dx;
        SCROLLABLE_TARGET.scrollTop  = this.dragPosition.top  - dy;
    }

    /**
     * KeyDown EventListener
     * Note: The HTML Canvas element must have tabindex="0" attribute or keyboard input won't work
     * @param event KeybordEvent
     */
    private onCanvasKeyDown(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        const allowedKeysOnLandingPage = ['m', 'g', 'o'];

        // Don't trigger shortcut if no data or more complex predefined shortcut by browser
        if((
            !this.hasData() && 
            !allowedKeysOnLandingPage.includes(key)) || 
            event.ctrlKey || 
            event.shiftKey
        ) {
            return;
        }

        const commands = {
            'g': this.menuOnGitHub.bind(this),
            's': this.menuOnAlignStart.bind(this),
            'e': this.menuOnAlignEnd.bind(this),
            'c': this.menuOnAlignCenter.bind(this),
            'z': this.menuOnZoomReset.bind(this),
            'i': this.menuOnInfo.bind(this),
            'h': this.menuOnLandingPage.bind(this),
            'o': this.menuOnDataImport.bind(this),
            'p': this.menuOnExportPNG.bind(this),
            'd': this.menuOnDataExport.bind(this),
            'n': this.menuOnFetchNotification.bind(this),
            '+': this.menuOnZoomDelta.bind(this, 1),
            '-': this.menuOnZoomDelta.bind(this, -1),
            'm': this.menu.toggleMenuStrip.bind(this.menu)
        };

        commands[key]?.call();
    }

    /**
     * MouseMove EventListener
     * @param event MouseEvent
     */
    private onCanvasMouseMove(event: MouseEvent): void {
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
    private onCanvasWheel(event: WheelEvent): void {
        // Disable default vertical scroll of canvas
        event.preventDefault();
        event.stopPropagation();

        // Don't zoom the landing page and only allow zoom if ctrlKey is down
        if(!this.hasData() || !event.ctrlKey) {
            return;
        }

        // The sign needs to be fliped or the scrolling will be inverted from what user expects
        const flipSign = -1;
        const deltaY = event.deltaY * flipSign;
        this.zoomTimeline(event.clientX, event.clientY, deltaY);
    }

    /**
     * Handles all click events on the canvas
     * The coordinates are checked against the plotted activities to display modal window for the correct activity
     * @param event Browser DragEvent
     */
    private onCanvasClick(event: MouseEvent): void {
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
    private onCanvasMouseUp(): void {
        this.canvas.removeEventListener('mousemove', this.canvasMouseMoveCallback);

        // This listener must be on the document and not the canvas
        // Or it will get stuck if the mouse is moved outside the window/canvas
        document.removeEventListener('mouseup', this.canvasMouseUpCallback);

        this.canvas.style.cursor = 'default';
    }

    /**
     * When a file is dropped on the canvas
     * @param event Browser DragEvent
     */
    private onCanvasDrop(event: DragEvent): void{
        const dataTransfer = event.dataTransfer;
        const files = dataTransfer!.files;
    
        // Can only parse and display one file at the time
        // Take the first file that was dropped
        const firstFile = <File>files.item(0);
        this.handleFileBeforeParse(firstFile);
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

    // --------------------------------------------------------------
    // Menu callback methods
    // --------------------------------------------------------------

    /**
     * Callback function from Menu - Resets to Landing Page
     */
    menuOnLandingPage(): void {
        this.days  = DefaultData.days;
        this.style = DefaultData.style;
        this.meta  = DefaultData.meta;

        this.renderLandingPage();
    }

    /**
     * Callback function from Menu - Pans to the start (left) of the Timeline
     */
    menuOnAlignStart(): void {
        this.scrollTimeline(ScrollPosition.Start);
    }

    /**
     * Callback function from Menu - Pans to the end (right) of the Timeline
     */
    menuOnAlignEnd(): void {
        this.scrollTimeline(ScrollPosition.End);
    }

    /**
     * Callback function from Menu - Pans to the center of the Timeline
     */
    menuOnAlignCenter(): void {
        this.scrollTimeline(ScrollPosition.Center);
    }

    /**
     * Callback function from Menu - Exports Timeline as PNG
     */
    menuOnExportPNG(): void {
        if(!this.hasData()) {
            return;
        }

        const dataURL = this.canvas.toDataURL('image/png', 1.0);
        download(this.fileData.name + '.png', dataURL);
    }

    /**
     * Callback function from Menu - Displays GitHub information
     */
    menuOnGitHub(): void {
        const aboutAlert = new Alert(`
            <h3 class="at-m-0">GitHub</h3>
            <p>Developed by Qulle <a href="https://github.com/qulle/activity-timeline" target="_blank" class="at-link">github.com/qulle/activity-timeline</a></p>
        `);
    }

    /**
     * Callback function from Menu - Displays Info about the current Timeline
     */
    menuOnInfo(): void {
        if(!this.hasData()) {
            return;
        }

        let maxActivities = 0;
        let minActivities = Number.MAX_VALUE;
        let totActivities = 0;

        this.days.forEach((day) => {
            const dayLenght = day.activities.length;

            if(dayLenght > maxActivities) {
                maxActivities = dayLenght;
            }

            if(dayLenght < minActivities) {
                minActivities = dayLenght;
            }

            totActivities += dayLenght;
        });

        const startDate  = this.days[0].date;
        const endDate    = this.days[this.days.length - 1].date;
        const dateDiff   = endDate.getTime() - startDate.getTime();
        const timePeriod = Math.ceil(dateDiff / (1000 * 3600 * 24));
        const avarage    = totActivities / this.days.length;
        const percent    = (this.days.length / timePeriod) * 100;

        const content = `
            <h3>📝 File meta</h3>
            <p>File: <strong>${this.fileData.name}.${this.fileData.extension}</strong></p>
            <p>Opened: <strong>${this.fileData.opened.toLocaleTimeString(this.meta.locale)}</strong></p>
            <p>Localization: <strong>${this.meta.locale}</strong></p>
            <h3>📉 Statistics</h3>
            <p>First date: <strong>${startDate.toLocaleDateString(this.meta.locale)}</strong></p>
            <p>Last date: <strong>${endDate.toLocaleDateString(this.meta.locale)}</strong></p>
            <p>Time period: <strong>${timePeriod} days</strong></p>
            <p>Activities on: <strong>${this.days.length} days</strong> corresponding to <strong>${Number(percent.toFixed(2))}%</strong> of time period</p>
            <p>Total activites: <strong>${totActivities} st</strong></p>
            <p>Most activites in a day: <strong>${maxActivities} st</strong></p>
            <p>Least activites in a day: <strong>${minActivities} st</strong></p>
            <p>Avarage activites in a day: <strong>${Number(avarage.toFixed(2))} st</strong></p>
        `;

        const modal = new Modal('Current Timeline', content);
    }

    /**
     * Callback function from Menu - Resets Zoom to default value
     */
    menuOnZoomReset(): void {
        if(!this.hasData()) {
            return;
        }

        this.resetZoom();
    }

    /**
     * Callback function from Menu - Zooms in or out based on delta value
     * @param deltaY Positive value = Zoom in, Negative value = Zoom out
     */
    menuOnZoomDelta(deltaY: number): void {
        if(!this.hasData()) {
            return;
        }

        // Zoom using center of window as reference point
        const centerX = window.innerWidth  / 2;
        const centerY = window.innerHeight / 2;
        this.zoomTimeline(centerX, centerY, deltaY);
    }

    /**
     * Callback function from Menu - Import file to render
     */
    menuOnDataImport(): void {
        const fileDialog = document.createElement('input');
        fileDialog.className = 'at-d-none';
        fileDialog.setAttribute('type', 'file');
        fileDialog.setAttribute('accept', '.json, .csv');
        fileDialog.addEventListener('change', (event: Event) => {
            const fileDialog = <HTMLInputElement>event.target;
            const firstFile = fileDialog.files![0];
            this.handleFileBeforeParse(firstFile);
        });

        // Open the dialog
        fileDialog.click();
    }

    /**
     * Callback function from Menu - Export data to JSON or CSV file
     */
    menuOnDataExport(): void {
        if(!this.hasData()) {
            return;
        }

        // Note: Swapped file-formats to save in the format that was not opened
        const fileParsers = {
            'json': this.exportAsCSV.bind(this),
            'csv' : this.exportAsJSON.bind(this)
        };

        const parser = fileParsers[this.fileData.extension];

        if(parser) {
            parser.call();
        }else {
            const fileTypeAlert = new Alert(`
                <h3 class="at-m-0">Oops!</h3>
                <p>Could not decide fileformat - report as <a href="https://github.com/qulle/activity-timeline/issues" target="_blank" class="at-link">bug</a></p>
            `);
        }
    }

    menuOnFetchNotification(): void {
        const notificationModal = new Modal('Notifications', '<p>Loading notifications...</p>');
        const timestamp = new Date().getTime().toString();

        fetch(NOTIFICATION_URL + '?cache=' + timestamp)
            .then(async (response) => {
                const data = await response.json();

                if(!response.ok) {
                    return Promise.reject((data && data.message) || response.status);
                }

                let features = '';
                if(data.features.length === 0) {
                    features = '<p>No features currently under development</p>';
                }else {
                    data.features.forEach((feature: string) => {
                        features += `<p>${feature}</p>`;
                    });
                }

                const content = `
                    <h3>👋 From Qulle</h3>
                    <p>${data.qulle}</p>
                    <h3>🔭 Your version</h3>
                    <p>
                        <a href="https://github.com/qulle/activity-timeline/tree/main/examples/v${VERSION}" target="_blank" class="at-link">
                            v${VERSION}
                        </a>
                    </p>
                    <h3>🚀 Latest version</h3>
                    <p>
                        <a href="https://github.com/qulle/activity-timeline/tree/main/examples/v${data.latest}" target="_blank" class="at-link">
                            v${data.latest} - ${new Date(data.released).toLocaleDateString(this.meta.locale)}
                        </a>
                    </p>
                    <h3>💡 New features under development</h3>
                    ${features}
                `;

                notificationModal.setModalContent(content);
            })
            .catch(error => {
                const content = `
                    <h3>👋 From Qulle</h3>
                    <p>Glad you are using my App, hope you find it useful!</p>
                    <h3>🔭 Your version</h3>
                    <p>
                        <a href="https://github.com/qulle/activity-timeline/tree/main/examples/v${VERSION}" target="_blank" class="at-link">
                            v${VERSION}
                        </a>
                    </p>
                    <h3>📡 Fetch error</h3>
                    <p>Data from the GitHub repo could not be fetched</p>
                `;

                notificationModal.setModalContent(content);
                console.error(`Fetch error [${error}]`);
            });
    }

    // --------------------------------------------------------------
    // Logical methods
    // --------------------------------------------------------------

    /**
     * Export the loaded data as CSV-file (JSON file was opened by user)
     */
    private exportAsCSV(): void {
        const data: Data = {
            meta:  { ...this.meta  },
            style: { ...this.style },
            days:  [ ...this.days  ]
        };

        const lineBreak = '\r\n'; 
        const json = JSON.stringify(data, (key, value) => {
            // Remove days from the JSON to be stored as meta in the 5th column
            if(key === 'days') {
                value = undefined;
            }

            return value;
        });
        
        let csv = `Timestamp;Title;Description;Fill Color;Stroke Color;${json}${lineBreak}`;

        data.days.forEach((day) => {
            day.activities.forEach((activity) => {
                csv += `${activity.timestamp.toLocaleString(data.meta.locale)};${activity.title};${activity.description};${activity.fillColor};${activity.strokeColor}${lineBreak}`;
            });
        });

        // Remove last lineBreak from output to avoid empty line in the CSV-file
        csv = csv.replace(/\r\n*$/, '');

        download(this.fileData.name + '.csv', csv);
    }

    /**
     * Export the loaded data as JSON-file (CSV file was opened by user)
     */
    private exportAsJSON(): void {
        const data: Data = {
            meta:  { ...this.meta  },
            style: { ...this.style },
            days:  [ ...this.days  ]
        };

        const indentationSpaces = 4;
        const json = JSON.stringify(data, (key, value) => {
            // Remove the coordinates from the output, only used internally
            if(key === 'x' || key === 'y') {
                value = undefined;
            }
            
            // Remove default time information from the date
            if(key === 'date') {
                value = new Date(value).toLocaleDateString(data.meta.locale);
            }

            // When a JSON-file is loaded the data + time is added together
            // Split them apart to not have duplication of information in the file
            if(key === 'timestamp') {
                value = new Date(value).toLocaleTimeString(data.meta.locale);
            }

            return value;
        }, indentationSpaces);

        download(this.fileData.name + '.json', json);
    }

    /**
     * Handles preparation and verifying file extension before parsing the file
     * @param file File to be parsed
     */
    private handleFileBeforeParse(file: File): void {
        const index     = file.name.lastIndexOf('.');
        const filename  = file.name.substring(0, index) || file.name;
        const extension = file.name.substring(index + 1).toLowerCase() || file.name;

        // Store information about the opened file, used at other palces
        this.fileData = {
            name: filename,
            extension: extension,
            opened: new Date()
        };

        const fileParsers = {
            'json': this.parseJSONFile,
            'csv' : this.parseCSVFile
        };

        const parser = fileParsers[extension];

        if(parser) {
            parser.call(this, file);
        }else {
            const fileTypeAlert = new Alert(`
                <h3 class="at-m-0">Oops!</h3>
                <p>Can only parse <strong>.json</strong> or <strong>.csv</strong> files</p>
            `);
        }
    }

    /**
     * Zoom in or out at a given X, Y coordinate
     * @param deltaY Positive value = Zoom in, Negative value = Zoom out
     */
    private zoomTimeline(mouseX: number, mouseY: number, deltaY: number): void {
        const direction = Math.sign(deltaY);

        let referenceZoomPoint: Coordinate = {
            x: (mouseX + SCROLLABLE_TARGET.scrollLeft) / this.zoom.value, 
            y: (mouseY + SCROLLABLE_TARGET.scrollTop)  / this.zoom.value
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
        SCROLLABLE_TARGET.scrollTop  = targetZoomPoint.y;
    }

    /**
     * Scroll Timeline to vertical center and horizontal discrete location
     * @param position 'start' | 'end' | 'center'
     */
    private scrollTimeline(position: ScrollPosition): void {
        if(!this.hasData()) {
            return;
        }

        // Had problems with this.canvas.scrollIntoView({behaviour: 'smooth', block: 'center', inline: 'end'})
        // It worked fine in Firefox but didn't fully work in Chrome, so i went for a manual approach

        // Always center vertically as the Timeline's X-axis is most interesting
        const verticalMidWindow = window.innerHeight / 2;
        const verticalMidCanvas = parseInt(this.canvas.style.height, 10) / 2;
        const dY = Math.abs(verticalMidWindow - verticalMidCanvas);

        // Pick horizontal position
        const canvasCSSWidth = parseInt(this.canvas.style.width, 10);
        const horizontalMidWindow = window.innerWidth / 2;
        const horizontalPositions = {
            'start' : 0,
            'end'   : canvasCSSWidth,
            'center': Math.abs(horizontalMidWindow - canvasCSSWidth / 2),
        };

        const dX = horizontalPositions[position];

        window.scrollTo({ 
            top: dY, 
            left: dX, 
            behavior: 'smooth'
        });
    }

    /**
     * Resets zoom level to standard and re-renders Timeline
     */
    private resetZoom(): void {
        this.zoom.value = 1;
        
        // Only re-render the Timeline, not the Landing Page
        // We are already rendering the Landing Page when the resetZoom method is called
        if(this.hasData()) {
            this.render();
        }
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
     * Parse the given JSON-file that was dropped and render the Timeline
     * @param file The file that was dropped
     */
    private parseJSONFile(file: File): void {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.addEventListener('loadend', () => {
            let currentDate: string;

            try {
                // Parse the JSON-file and convert date and timestamps to date objects, easier to work with later
                const json = <string>reader.result;
                const parse = JSON.parse(json, function(key, value) {
                    if(key === 'date') {
                        currentDate = value;
                        value = new Date(value);
                    }else if(key === 'timestamp') {
                        value = new Date(currentDate + ' ' + value);
                    }

                    if(typeof value === 'string') {
                        value.trim();
                    }

                    return value;
                });

                const data: Data = {
                    meta:  { ...DefaultData.meta,  ...(parse['meta']  || {}) },
                    style: { ...DefaultData.style, ...(parse['style'] || {}) },
                    days:  [ ...DefaultData.days,  ...(parse['days']  || []) ]
                };

                this.setData(data);
                this.render();
                this.scrollTimeline(ScrollPosition.End);
            }catch(error: any) {
                console.error(`JSON parsing error [${error}]`);
                const parseAlert = new Alert(`
                    <h3 class="at-m-0">Oops!</h3>
                    <p>Error parsing the <strong>JSON</strong> file - check the syntax</p>
                `);
            }
        });
    }

    /**
     * Parse the given CSV file that was dropped and render the Timeline
     * @param file The file that was dropped
     */
    private parseCSVFile(file: File): void {
        const reader = new FileReader();
        reader.readAsText(file, 'iso-8859-1');
        reader.addEventListener('loadend', () => {
            try {
                let meta  = {};
                let style = {};

                // Remove ghost lines that dosen't contain any data what so ever - Excel might not remove the delimiter
                const csv = (<string>reader.result)
                    .replace(';;;;;', '') // Ghost rows in files with JSON Data
                    .replace(';;;;', '')  // Ghost rows in files without JSON Data
                    .trim();              // Remove pre- and post linebreaks

                const headerNames = ['timestamp', 'title', 'description', 'fillColor', 'strokeColor', 'json'];
                const parse = Papa.parse<Activity>(csv, {
                    header: true,
                    delimiter: ';',
                    skipEmptyLines: true,
                    transformHeader: function(header: string, index: number) {
                        // Check if there is data in the 5th column, this is meta and/or style in JSON format
                        if(index === 5) {
                            const jsonHeader = JSON.parse(header);
                            meta  = jsonHeader['meta'];
                            style = jsonHeader['style'];
                        }

                        // Replace header names from the users file to the correct internal name
                        // Note: Important that the user provides the columns in the correct order
                        return headerNames[index];
                    },
                    transform: function(value: string, header: string) {
                        return value.trim();
                    }
                });

                // If there was a 5th column with JSON data
                // Remove that empty property from the data
                parse.data.forEach((row) => {
                    delete row['json'];
                });
                
                // Group the activites by date 
                const groupedDays = parse.data.reduce((activites: Object, row: Activity) => {
                    const date = new Date(row.timestamp);
                    const dateString = date.toDateString();
                    
                    // Update timestamp from string to Date object, easier to work with later
                    row.timestamp = date;

                    // Create day if not exist
                    if(!activites[dateString]) {
                        activites[dateString] = [];
                    }

                    // Add row/activity to the correct day in the array
                    activites[dateString].push(row);
    
                    return activites;
                }, {});

                // Re-arrange the structure of the object
                const days = Object.keys(groupedDays).map((date: string) => {
                    return {
                        date: new Date(date),
                        activities: groupedDays[date]
                    };
                });

                const data: Data = {
                    meta:  { ...DefaultData.meta,  ...(meta  || {}) },
                    style: { ...DefaultData.style, ...(style || {}) },
                    days:  [ ...DefaultData.days,  ...(days  || []) ]
                };

                this.setData(data);
                this.render();
                this.scrollTimeline(ScrollPosition.End);
            }catch(error: any) {
                console.error(`CSV parsing error [${error}]`);
                const parseAlert = new Alert(`
                    <h3 class="at-m-0">Oops!</h3>
                    <p>Error parsing the <strong>CSV</strong> file - check the syntax</p>
                `);
            }
        });
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
    private calculateWidth(pixelRatio: number): number {
        // window.innerWidth is the minimum width of the canvas
        let width = window.innerWidth * pixelRatio;

        // Calculate appropriate width
        let calculatedWidth = 0;

        // Add default padding
        calculatedWidth += DefaultConstants.xPadding * pixelRatio * (this.zoom.value > 1 ? this.zoom.value : 1);
        // Add required width based on data to be rendered
        calculatedWidth += DefaultConstants.stepDistanceXAxis * pixelRatio * this.zoom.value * this.days.length;

        if(calculatedWidth > width) {
            width = calculatedWidth;
        }

        return width;
    }

    /**
     * Calculates the height of the canvas base on the data to be rendered
     * @returns Height of the canvas, minimum height is the window.innerHeight
     */
    private calculateHeight(pixelRatio: number): number {
        // window.innerHeight is the minimum height of the canvas
        let height = window.innerHeight * pixelRatio;
        let maxActivitiesOnYAxis = 0;

        // Find the day with most activites to be rendered on the Y-axis
        this.days.forEach((day) => {
            if(day.activities.length > maxActivitiesOnYAxis) {
                maxActivitiesOnYAxis = day.activities.length;
            } 
        });

        // Calculate appropriate height
        let calculatedHeight = 0;

        // Add default padding
        calculatedHeight += DefaultConstants.yPadding * pixelRatio * (this.zoom.value > 1 ? this.zoom.value : 1);
        // Add required height based on data to be rendered (both directions on Y-axis)
        calculatedHeight += DefaultConstants.stepDistanceYAxis * pixelRatio * this.zoom.value * maxActivitiesOnYAxis * 2;

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
        return (this.canvas.height / 2 - this.style.lineThickness / 2) / (this.zoom.value * DEVICE_PIXEL_RATIO);
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
     * Checks direction to render activities/labels on the Y-axis
     * @param index Iterator-index from loop
     * @returns True if rendering towards top, False if towards bottom
     */
    private isTop(index: number): boolean {
        return index % 2 === 0;
    }

    /**
     * Checks direction to render activities/labels on the Y-axis
     * @param index Iterator-index from loop
     * @returns True if rendering towards bottom, False if towards top
     */
    private isBottom(index: number): boolean {
        return !this.isTop(index);
    }

    /**
     * Get the Activity that corresponds to the clicked/hovered location in the canvas
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
        const relX = (x - rect.left) / (this.zoom.value * DEVICE_PIXEL_RATIO);
        const relY = (y - rect.top)  / (this.zoom.value * DEVICE_PIXEL_RATIO);

        // How far the detection will be checked away from the clicked coordinate
        const tolerance = DefaultConstants.radius / DEVICE_PIXEL_RATIO;

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
     * @param data Meta, Style and Array of days to be rendered
     */
    setData(data: Data): void {
        // Note: The data has been merged with the default data and handled in specific ways in the JSON/CSV-parse methods
        // The data should be 100% valid when it arrives here
        this.meta  = data.meta;
        this.style = data.style;
        this.days  = data.days;

        // Sort days in ascending order
        this.days.sort((left, right) => {
            return left.date.getTime() - right.date.getTime();
        });

        // Sort activities in each day in ascending order
        this.days.forEach((day) => {
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
        // Reset zoom, the user might have zoomed the Timeline and then navigated to the Landing Page
        this.resetZoom();

        // Context to render elements on
        const ctx = <CanvasRenderingContext2D>this.canvas.getContext('2d');

        // Set canvas width and height based no the window and the devicePixelRatio
        this.canvas.width  = window.innerWidth  * DEVICE_PIXEL_RATIO;
        this.canvas.height = window.innerHeight * DEVICE_PIXEL_RATIO;

        // Clear the canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Note: This will affect all things that are drawn. 
        // In some places values must be corrected by multiplying or dividing with the zoom.value
        ctx.scale(this.zoom.value * DEVICE_PIXEL_RATIO, this.zoom.value * DEVICE_PIXEL_RATIO);

        // Set the canvas element width and height to shrink the canvas on devices that have ratio > 1
        this.canvas.style.width  = window.innerWidth  + 'px';
        this.canvas.style.height = window.innerHeight + 'px';

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
            window.innerWidth  / 2 - dropSquareWidth  / 2,
            window.innerHeight / 2 - dropSquareHeight / 1.8,
            dropSquareWidth,
            dropSquareHeight
        );
        ctx.strokeRect(
            window.innerWidth  / 2 - dropSquareWidth  / 2,
            window.innerHeight / 2 - dropSquareHeight / 1.8,
            dropSquareWidth, 
            dropSquareHeight
        );

        // Note: The Path2D SVG is generated for size 100 * 76
        const dropIconDimensions = { width: 100, height: 76 };
        const dropIconSVGPath = new Path2D('M37.5 21.875C37.5 19.3886 38.4877 17.004 40.2459 15.2459C42.004 13.4877 44.3886 12.5 46.875 12.5H53.125C55.6114 12.5 57.996 13.4877 59.7541 15.2459C61.5123 17.004 62.5 19.3886 62.5 21.875V28.125C62.5 30.6114 61.5123 32.996 59.7541 34.7541C57.996 36.5123 55.6114 37.5 53.125 37.5V43.75H87.5C88.3288 43.75 89.1237 44.0792 89.7097 44.6653C90.2958 45.2513 90.625 46.0462 90.625 46.875V53.125C90.625 53.9538 90.2958 54.7487 89.7097 55.3347C89.1237 55.9208 88.3288 56.25 87.5 56.25C86.6712 56.25 85.8763 55.9208 85.2903 55.3347C84.7042 54.7487 84.375 53.9538 84.375 53.125V50H53.125V53.125C53.125 53.9538 52.7958 54.7487 52.2097 55.3347C51.6237 55.9208 50.8288 56.25 50 56.25C49.1712 56.25 48.3763 55.9208 47.7903 55.3347C47.2042 54.7487 46.875 53.9538 46.875 53.125V50H15.625V53.125C15.625 53.9538 15.2958 54.7487 14.7097 55.3347C14.1237 55.9208 13.3288 56.25 12.5 56.25C11.6712 56.25 10.8763 55.9208 10.2903 55.3347C9.70424 54.7487 9.375 53.9538 9.375 53.125V46.875C9.375 46.0462 9.70424 45.2513 10.2903 44.6653C10.8763 44.0792 11.6712 43.75 12.5 43.75H46.875V37.5C44.3886 37.5 42.004 36.5123 40.2459 34.7541C38.4877 32.996 37.5 30.6114 37.5 28.125V21.875ZM0 71.875C0 69.3886 0.98772 67.004 2.74587 65.2459C4.50403 63.4877 6.8886 62.5 9.375 62.5H15.625C18.1114 62.5 20.496 63.4877 22.2541 65.2459C24.0123 67.004 25 69.3886 25 71.875V78.125C25 80.6114 24.0123 82.996 22.2541 84.7541C20.496 86.5123 18.1114 87.5 15.625 87.5H9.375C6.8886 87.5 4.50403 86.5123 2.74587 84.7541C0.98772 82.996 0 80.6114 0 78.125L0 71.875ZM37.5 71.875C37.5 69.3886 38.4877 67.004 40.2459 65.2459C42.004 63.4877 44.3886 62.5 46.875 62.5H53.125C55.6114 62.5 57.996 63.4877 59.7541 65.2459C61.5123 67.004 62.5 69.3886 62.5 71.875V78.125C62.5 80.6114 61.5123 82.996 59.7541 84.7541C57.996 86.5123 55.6114 87.5 53.125 87.5H46.875C44.3886 87.5 42.004 86.5123 40.2459 84.7541C38.4877 82.996 37.5 80.6114 37.5 78.125V71.875ZM75 71.875C75 69.3886 75.9877 67.004 77.7459 65.2459C79.504 63.4877 81.8886 62.5 84.375 62.5H90.625C93.1114 62.5 95.496 63.4877 97.2541 65.2459C99.0123 67.004 100 69.3886 100 71.875V78.125C100 80.6114 99.0123 82.996 97.2541 84.7541C95.496 86.5123 93.1114 87.5 90.625 87.5H84.375C81.8886 87.5 79.504 86.5123 77.7459 84.7541C75.9877 82.996 75 80.6114 75 78.125V71.875Z');

        // Render drop text
        const dropLabel = 'DROP TIMELINE DATA FILE';
        ctx.font = `italic bold 20px Arial`;
        ctx.fillStyle = this.style.textColor;
        ctx.fillText(
            dropLabel, 
            window.innerWidth  / 2 - ctx.measureText(dropLabel).width / 2,
            window.innerHeight / 2 + dropIconDimensions.height / 2,
        );

        // Render version text
        const versionLabel = 'Version ' + VERSION;
        ctx.font = `italic 14px Arial`;
        ctx.fillText(
            versionLabel, 
            window.innerWidth  / 2 - ctx.measureText(versionLabel).width / 2,
            window.innerHeight / 2 + dropIconDimensions.height / 2 + 20,
        );

        // Render drop icon
        ctx.translate(
            (window.innerWidth  / 2) - dropIconDimensions.width  / 2, 
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

        // Set canvas width and height based no the data and the devicePixelRatio
        const resolutionWidth  = this.calculateWidth(DEVICE_PIXEL_RATIO);
        const resolutionHeight = this.calculateHeight(DEVICE_PIXEL_RATIO);

        this.canvas.width  = resolutionWidth;
        this.canvas.height = resolutionHeight;

        // Clear the canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Canvas background
        ctx.fillStyle = this.style.backgroundColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Note: This will affect all things that are drawn. 
        // In some places values must be corrected by multiplying or dividing with the zoom.value
        ctx.scale(this.zoom.value * DEVICE_PIXEL_RATIO, this.zoom.value * DEVICE_PIXEL_RATIO);

        // Set the canvas element width and height to shrink the canvas on devices that have ratio > 1
        this.canvas.style.width  = Number(resolutionWidth  / DEVICE_PIXEL_RATIO) + 'px';
        this.canvas.style.height = Number(resolutionHeight / DEVICE_PIXEL_RATIO) + 'px';

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
        ctx.lineTo((this.canvas.width / (this.zoom.value * DEVICE_PIXEL_RATIO)) - DefaultConstants.canvasInternalPadding, mid);
        ctx.stroke();

        // Render each day on Timeline
        this.days.forEach((day, index) => {
            const x = DefaultConstants.xPadding + (DefaultConstants.stepDistanceXAxis * index);
            const y = mid;

            // If placement is top or bottom direction on the Y-axis
            const sign = this.isTop(index) 
                ? 1 
                : -1;

            // Adjust for the text height on top position label when rendering activities towards bottom
            const signAdjustment = this.isBottom(index) 
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
                activity.x = posX / DEVICE_PIXEL_RATIO
                activity.y = posY / DEVICE_PIXEL_RATIO;

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
