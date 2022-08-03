# Activity Timeline
Portable Activity Timeline that draws the Timeline based on data given in `JSON` or `CSV` format. By clicking on any activity a detailed modal window is displayed. Initially developed for post incident investigations to get a overview of the situation in an it-environment.

## Latest build - [Demo](https://qulle.github.io/activity-timeline/)
All version can be found in the `examples` directory.

## Screenshots
The application is not limited to a light and dark theme. Any colors can be used to create custom themes.

### Light
![Screenshot Light Theme](images/demo-light.png?raw=true "Screenshot Light Theme")

### Dark
![Screenshot Dark Theme](images/demo-dark.png?raw=true "Screenshot Dark Theme")

## Usage
The application is portable, launch the HTML-file in the browser and drop a JSON/CSV-file in the application. The application renders a Timeline of all activities and provides an easy-to-understand sequence of events.

## Shortcut keys
- `s` pans to the start of the Timeline
- `e` pans to the end of the Timeline
- `z` resets to the default zoom level
- `ctrl + wheel` zooms the Timeline
- `click + drag` pans the Timeline

## Data
There are two ways of providing data, either via `JSON` or `CSV`. In both cases the data is sorted in the application to always be shown in the correct order according to the date and timestamp. The description is displayed in a modal window when an activity is clicked in the Timeline.

### JSON
The data is provided in an array of days.
```json
{
    "days": [
        {
            "date": "2022-07-08",
            "activities": [
                {
                    "timestamp": "12:23",
                    "title": "Patched webserver",
                    "description": "Some additional information about the activity",
                    "fillColor": "#D0CEE2",
                    "strokeColor": "#56517E"
                },
                {
                    "timestamp": "18:36",
                    "title": "Restarted application pool",
                    "description": "Some additional information about the activity",
                    "fillColor": "#FAD7AC",
                    "strokeColor": "#C27B25"
                }
            ]
        },
        {
            "date": "2022-07-10",
            "activities": [
                {
                    "timestamp": "12:05",
                    "title": "New release application A",
                    "description": "Some additional information about the activity",
                    "fillColor": "#B1DDF0",
                    "strokeColor": "#10739E"
                }
            ]
        }
    ]
}
```

### CSV
The data is given in CSV format using `;` (semicolon) as delimiter. It is important that the columns follow the `same order` as example below. The names can be anything you want.

| Timestamp         | Title                      | Description                                    | Fill Color | Stroke Color |
|-------------------|----------------------------|------------------------------------------------|------------|--------------|
| 2022-07-08 12:23  | Patched webserver          | Some additional information about the activity | #D0CEE2    | #56517E      |
| 2022-07-08 18:36  | Restarted application pool | Some additional information about the activity | #FAD7AC    | #C27B25      |
| 2022-07-10 12:05  | New release application A  | Some additional information about the activity | #B1DDF0    | #10739E      |

## Theme
The theme can be controlled through parameters in in both the JSON and CSV format. Colors cab be provided in the formats `Hex`, `RGB(A)` and `Names`.

### JSON
The style is provided in a style-node. If properties are left out or no style-node is provided the internal default `light` theme will be used.
```json
{
    "style": {
        "textColor": "#D3D9E6",
        "timelineStrokeColor": "#D3D9E6",
        "strokeColor": "#353D4B",
        "fillColor": "#BAC8D3",
        "backgroundColor": "#3B4352"
    },
    "days": []
}
```

### CSV
There is no optimal way of provide additional data in a CSV-file in addition to the data itself. The style is provided in a JSON-formated string as a `last` header.
| Timestamp         | Title                      | Description                                    | Fill Color | Stroke Color | {"style":{"textColor":"#D3D9E6","timelineStrokeColor":"#D3D9E6","strokeColor":"#353C4B","backgroundColor":"#3B4352"}} |
|-------------------|----------------------------|------------------------------------------------|------------|--------------|-----------------------------------------------------------------------------------------------------------------------|
| 2022-07-08 12:23  | Patched webserver          | Some additional information about the activity | #D0CEE2    | #56517E      |                                                                                                                       |
| 2022-07-08 18:36  | Restarted application pool | Some additional information about the activity | #FAD7AC    | #C27B25      |                                                                                                                       |
| 2022-07-10 12:05  | New release application A  | Some additional information about the activity | #B1DDF0    | #10739E      |                                                                                                                       |

## Meta information
The meta data can be controlled through parameters in in both the JSON and CSV format.

### JSON
The meta data is provided in a meta-node. If properties are left out or no meta-node is provided the internal default meta data will be used. The internal uses the `current version` of the application along with `en-us` locale.
```json
{
    "meta": {
        "version": "1.1.0",
        "locale": "sv-se"
    },
    "style": {},
    "days": []
}
```

### CSV
There is no optimal way of provide additional data in a CSV-file in addition to the data itself. The meta data is provided in a JSON-formated string as a `last` header.
| Timestamp         | Title                      | Description                                    | Fill Color | Stroke Color | {"meta":{"version":"1.1.0","locale":"en-us"}} |
|-------------------|----------------------------|------------------------------------------------|------------|--------------|-----------------------------------------------|
| 2022-07-08 12:23  | Patched webserver          | Some additional information about the activity | #D0CEE2    | #56517E      |                                               |
| 2022-07-08 18:36  | Restarted application pool | Some additional information about the activity | #FAD7AC    | #C27B25      |                                               |
| 2022-07-10 12:05  | New release application A  | Some additional information about the activity | #B1DDF0    | #10739E      |                                               |

To have both `style` and `meta` data in the CSV file, use this JSON-string.
```
{"meta":{"version":"1.1.0","locale":"en-us"},"style":{"textColor":"#D3D9E6","timelineStrokeColor":"#D3D9E6","strokeColor":"#353C4B","backgroundColor":"#3B4352"}}
```

## Get started
The dev-environment uses NPM so you need to have [Node.js](https://nodejs.org/en/) installed. I use Node version *16.16.0* and NPM version *8.11.0*.

Clone the repo.
```
$ git clone https://github.com/qulle/activity-timeline.git
```

Install all dependencies from package.json.
```
$ npm install
```

Start the [Parcel](https://parceljs.org/) server.
```
$ npm start
```

Make build for distribution.
```
$ npm run build
```

Use the following command to remove dist directory. Uses `rm -rf dist/ .parcel-cache/`
```
$ npm run clean
```

## Creds To
- [PapaParser 5.3.2](https://www.papaparse.com/)
- [Bootstrap Icons](https://icons.getbootstrap.com/)

## License
[BSD-2-Clause License](LICENSE)

## Author
[Qulle](https://github.com/qulle/)