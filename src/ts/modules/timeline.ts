import { Day } from '../models/day.model';
import { CTorOptions } from '../models/ctor-options.model';
import { TimelineConstants } from '../defaults/timeline-constants.default';
import { TimelineStyle as DefaultTimelineStyle } from '../defaults/timeline-style.default';
import { TimelineStyle } from '../models/timeline-style.model';

/**
 * Class to draw timeline with activities on a HTMLCanvasElement
 */
class Timeline {
    // CTor parameters
    private canvas: HTMLCanvasElement;
    private locale: string;

    // Internal timeline data
    private days: Day[];
    private timelineStyle: TimelineStyle;

    constructor(options: CTorOptions) {
        this.canvas = options.canvas;
        this.locale = options.locale;

        // Set default style, can be overridden from the JSON-files
        this.timelineStyle = DefaultTimelineStyle

        // Re-render view if the window is resized
        window.addEventListener('resize', () => {
            if(this.days) {
                this.render();
            }else {
                this.renderLandingPage();
            }
        });

        this.renderLandingPage();
    }

    /**
     * Calculates the width of the canvas base on the data to be drawn
     * @returns Width of the canvas, minimum width is the window.innerWidth
     */
    private calculateWidth(): number {
        // window.innerWidth is the minimum width of the canvas
        let width = window.innerWidth;

        const calculatedWidth = TimelineConstants.xPadding + (TimelineConstants.stepDistanceXAxis * TimelineConstants.amplification * this.days.length);

        if(calculatedWidth > width) {
            width = calculatedWidth;
        }

        return width;
    }

    /**
     * Calculates the height of the canvas base on the data to be drawn
     * @returns Height of the canvas, minimum height is the window.innerHeight
     */
    private calculateHeight(): number {
        // window.innerHeight is the minimum height of the canvas
        let height = window.innerHeight;
        let maxActivitiesOnYAxis = 0;

        // Find the day with most activites in both directions on the Y-axis
        this.days.forEach(day => {
            if(day.activities.length > maxActivitiesOnYAxis) {
                maxActivitiesOnYAxis = day.activities.length;
            } 
        });

        // Calculate appropriate height
        const calculatedHeight = TimelineConstants.yPadding + (TimelineConstants.stepDistanceYAxis * maxActivitiesOnYAxis * 2);

        if(calculatedHeight > height) {
            height = calculatedHeight;
        }

        return height;
    }

    /**
     * Calculates the Y-coordinate for where to draw the X-axis
     * @returns Y-coordinate for where to draw the X-axis
     */
    private getVerticalMid(): number {
        return this.canvas.height / 2 - this.timelineStyle.lineThickness / 2;
    }

    /**
     * Check if date is todays date
     * @param date String value of date to be checked
     * @returns True if date is today otherwise False
     */
    private isToday(date: string): boolean {
        const left  = new Date(date);
        const right = new Date();

        return left.getFullYear() === right.getFullYear() &&
               left.getMonth()    === right.getMonth()    && 
               left.getDate()     === right.getDate();
    }

    /**
     * Gets the long version of weekday from a given date
     * @param date String value of date to be converted to weekday
     * @returns Weekday in format [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
     */
    private getWeekDayName(date: string): string {
        // Translate date to weekday name
        const weekDay = new Date(date).toLocaleString(this.locale, { weekday: 'long' });
        
        // Make the first letter capialized
        return weekDay.charAt(0).toUpperCase() + weekDay.slice(1);
    }

    /**
     * Draws a circle in the canvas at a given coordinate
     * @param ctx HTMLCanvas 2d-context
     * @param x X-coordinate 
     * @param y Y-cordinate
     * @param radius Radius of the circle
     * @param fillColor Fillcolor of the circle
     * @param strokeColor Strokecolor of the circle
     */
    private drawCircle(
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
     * Checks direction to draw activities on the Y-axis
     * @param index Iterator-index from loop
     * @returns True if drawing towards top, False if towards bottom
     */
    private isTop(index: number): boolean {
        return index % 2 === 0;
    }

    /**
     * Sets the data to be drawn on the timeline
     * Sorts both days and activites in ascending order
     * @param data Array of days to be drawn
     */
    setData(data: Day[]): void {

        // TODO: Errohandling and rename the data: Day parameter.
        // It's confusing the way it's named now when the Day is wrapped inside the Data but the data is a Day[]....
        if('days' in data) {
            this.days = data['days'];
        }else {
            this.days = <Day[]>[];
        }
        
        // Reset to default style for each new file that is dropped
        this.timelineStyle = DefaultTimelineStyle;

        // Override default style with data from the JSON-file
        this.timelineStyle = {...this.timelineStyle, ...data['style']};

        // Sort days in ascending order
        this.days.sort((left, right) => {
            return new Date(left.date).getTime() - new Date(right.date).getTime();
        });

        // Sort activities in each day in ascending order
        this.days.forEach(day => {
            day.activities.sort((left, right) => {
                return new Date(day.date + ' ' + left.timestamp).getTime() - new Date(day.date + ' ' + right.timestamp).getTime();
            });
        });
    }

    /**
     * Renders the landing page when the app is first started
     */
    renderLandingPage(): void {
        // Context to draw elements on
        const ctx = this.canvas.getContext('2d');

        // Default canvas size same as window
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Clear the canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate appropriate dimensions for the drop square
        const dropSquareWidth = window.innerWidth < 620 
            ? 0.9 * window.innerWidth 
            : 600;

        const dropSquareHeight = window.innerHeight < 320 
            ? 0.9 * window.innerHeight 
            : 300;

        // Draw drop square
        ctx.fillStyle = '#E9E9E9';
        ctx.lineWidth = this.timelineStyle.lineThickness;
        ctx.strokeStyle = this.timelineStyle.strokeColor;
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

        // Note: The Path2D string is generated for 76*100 size
        const dropIconDimensions = { width: 76, height: 100 };
        const dropIconSVGPath = new Path2D('M38 100C47.9456 100 57.4839 96.0491 64.5165 89.0165C71.5491 81.9839 75.5 72.4456 75.5 62.5C75.5 52.1563 68.4875 44.35 60.3 35.2375C52.0875 26.1 42.6875 15.6438 38 0C38 0 0.5 35.5375 0.5 62.5C0.5 72.4456 4.45088 81.9839 11.4835 89.0165C18.5161 96.0491 28.0544 100 38 100ZM29.5375 29.0375L33.9625 33.4625C32.15 35.275 26.9125 41.6562 22.0438 51.4L16.4562 48.6C21.5812 38.3437 27.1875 31.3937 29.5375 29.0375Z');

        // Draw drop text
        const dropLabel = 'DROP TIMELINE JSON { }';
        ctx.font = `italic bold 20px Arial`;
        ctx.fillStyle = this.timelineStyle.textColor;
        ctx.fillText(
            dropLabel, 
            window.innerWidth / 2 - ctx.measureText(dropLabel).width / 2,
            window.innerHeight / 2 + dropIconDimensions.height / 2,
        );

        // Draw drop icon
        ctx.translate(
            (window.innerWidth / 2) - dropIconDimensions.width / 2, 
            (window.innerHeight / 2) - dropIconDimensions.height
        );
        ctx.fill(dropIconSVGPath);
    }

    /**
     * Renders the timeline on the canvas based on the given data
     */
    render(): void {
        // Context to draw elements on
        const ctx = this.canvas.getContext('2d');

        // Set canvas width and height based no the data
        this.canvas.width = this.calculateWidth();
        this.canvas.height = this.calculateHeight();

        // Clear the canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Canvas background
        ctx.fillStyle = this.timelineStyle.backgroundColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Get the mid of the canvas, must come after the calculate width/height
        const mid = this.getVerticalMid();

        // Default style
        ctx.font = `bold ${this.timelineStyle.fontSize}px Arial`;
        ctx.strokeStyle = this.timelineStyle.timelineStrokeColor;
        ctx.lineWidth = this.timelineStyle.lineThickness;
        ctx.lineCap = <CanvasLineCap>'round';

        // Draw main timeline
        ctx.beginPath();
        ctx.moveTo(TimelineConstants.canvasInternalPadding, mid);
        ctx.lineTo(this.canvas.width - TimelineConstants.canvasInternalPadding, mid);
        ctx.stroke();

        // Draw each day on timeline
        this.days.forEach((day, index) => {
            const x = TimelineConstants.xPadding + (TimelineConstants.stepDistanceXAxis * TimelineConstants.amplification * index);
            const y = mid;

            // If placement is top or bottom
            const sign = this.isTop(index) 
                ? 1 
                : -1;

            // Adjust for the text height on top positioned text
            const signAdjustment = sign === -1 
                ? this.timelineStyle.fontSize / 2 
                : 0;

            // Draw day timeline
            ctx.strokeStyle = this.timelineStyle.timelineStrokeColor;
            ctx.beginPath();
            ctx.setLineDash([5, 8]);
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + (day.activities.length * TimelineConstants.stepDistanceYAxis * -sign));
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw activities from that day
            day.activities.forEach((activity, index) => {
                // Draw activity-circle
                this.drawCircle(
                    ctx, 
                    x, 
                    y + TimelineConstants.stepDistanceYAxis * (index + 1) * -sign, 
                    TimelineConstants.radius, 
                    activity.fillColor, 
                    activity.strokeColor 
                );

                // Draw activity-label
                ctx.fillStyle = this.timelineStyle.textColor;
                ctx.fillText(
                    activity.title, 
                    x + TimelineConstants.radius * 1.5, 
                    y + TimelineConstants.stepDistanceYAxis * (index + 1) * -sign - 10 + this.timelineStyle.fontSize / 2
                );
                ctx.fillText(
                    new Date(day.date + ' ' + activity.timestamp).toLocaleTimeString(), 
                    x + TimelineConstants.radius * 1.5, 
                    y + TimelineConstants.stepDistanceYAxis * (index + 1) * -sign + 8 + this.timelineStyle.fontSize / 2
                );
            });

            // Draw date-circle on timeline
            this.drawCircle(
                ctx, 
                x, 
                y, 
                TimelineConstants.radius, 
                this.timelineStyle.fillColor, 
                this.timelineStyle.strokeColor
            );

            // Draw date-label
            const dateLabel = this.isToday(day.date) 
                ? day.date + ' (Today)' 
                : day.date + ' (' + this.getWeekDayName(day.date) + ')';
            ctx.fillStyle = this.timelineStyle.textColor;
            ctx.fillText(
                dateLabel, 
                x - ctx.measureText(dateLabel).width / 2, 
                y + signAdjustment + TimelineConstants.radius * 2 * sign
            );
        });
    }
}

export default Timeline;
