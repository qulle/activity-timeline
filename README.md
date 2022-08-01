# Activity Timeline
Portable activity Timeline that draws a Timeline based on data given in JSON format. By clicking on any activity a detailed modal window is displayed showing additional information about the activity.

## Latest build - [Demo](https://qulle.github.io/activity-timeline/)

## Screenshots
The application is not limited to a light and dark theme. Any colors can be used to create custom themes.

### Light
![Screenshot Light Theme](images/demo-light.png?raw=true "Screenshot Light Theme")

### Dark
![Screenshot Dark Theme](images/demo-dark.png?raw=true "Screenshot Dark Theme")

## Usage
The application is portable, launch the HTML file in the browser and drop a JSON file in the application. The application renders a Timeline of all activities and provides an easy-to-understand sequence of events.

### Shortcut keys
- `s` pans to the start of the Timeline
- `e` pans to the end of the Timeline
- `z` resets to the default zoom level
- `ctrl + wheel` zooms the Timeline
- `click + drag` pans the Timeline

### Data
The data is given in an array of days. The description is displayed in a modal window when an activity is clicked in the Timeline. The days and activities are sorted in the application to always be shown in the correct order according to the date and timestamp.
```json
{
    "days": [
        {
            "date": "2022-07-08",
            "activities": [
                {
                    "title": "Patched webserver",
                    "description": "Some additional information about the activity",
                    "timestamp": "12:23",
                    "fillColor": "#D0CEE2",
                    "strokeColor": "#56517E"
                },
                {
                    "title": "Restarted application pool",
                    "description": "Some additional information about the activity",
                    "timestamp": "18:36",
                    "fillColor": "#FAD7AC",
                    "strokeColor": "#C27B25"
                }
            ]
        },
        {
            "date": "2022-07-10",
            "activities": [
                {
                    "title": "New release application A",
                    "description": "Some additional information about the activity",
                    "timestamp": "12:05",
                    "fillColor": "#B1DDF0",
                    "strokeColor": "#10739E"
                }
            ]
        }
    ]
}
```

### Theme
The theme can be controlled through parameters in the JSON file style-node. If no style-node is present the application falls back to the default version using `light` theme.
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

### Meta information
The local timezone can be controlled through parameters in the JSON file meta-node. If no meta-node is present the application falls back to the default version using `en-us`. The version number is just a help to indicate to what version the JSON file was created. If no version number is configured the application version will be assumed.
```json
{
    "meta": {
        "version": "1.0.0",
        "locale": "sv-se"
    },
    "style": {},
    "days": []
}
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

## License
[BSD-2-Clause License](LICENSE)

## Author
[Qulle](https://github.com/qulle/)