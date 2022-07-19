# Activity Timeline
Portable activity timeline that draws the timeline based on data given in JSON format. 

## Latest build - [Demo](https://qulle.github.io/activity-timeline/)

## Screenshots
A picture says more than a thousand words, but the demo above says it all.

### Light
![Screenshot Light Theme](images/demo-light.png?raw=true "Screenshot Light Theme")

### Dark
![Screenshot Dark Theme](images/demo-dark.png?raw=true "Screenshot Dark Theme")

### Landing Page
![Screenshot Landing Page](images/landing-page.png?raw=true "Screenshot Landing Page")

## Usage
The application is portable, launch the HTML file in the browser and drop a JSON file in the application. The application renders a timeline of all activities and provides an easy-to-understand sequence of events.

You control the theme through parameters in the JSON file style-node. If no style-node is present the application falls back to the default (light) version.
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

The data is given in an array of days.
```json
{
    "days": [
        {
            "date": "2022-07-08",
            "activities": [
                {
                    "title": "Patched webserver",
                    "timestamp": "12:23",
                    "fillColor": "#D0CEE2",
                    "strokeColor": "#56517E"
                },
                {
                    "title": "Restarted application pool",
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
                    "title": "Restarted application pool",
                    "timestamp": "18:36",
                    "fillColor": "#FAD7AC",
                    "strokeColor": "#C27B25"
                }
            ]
        }
    ]
}
```

## Get started
The dev-environment uses NPM so you need to have [Node.js](https://nodejs.org/en/) installed. I use Node version *16.14.2* and NPM version *8.7.0*.

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

Use the following command to remove dist directory. Uses `rm -rf dist/`
```
$ npm run clean
```

Check for dependency updates.
```
$ npm outdated
```

Install dependency updates.
```
$ npm update --save
```

**Note** that from npm version `7.0.0` the command `$ npm update` does not longer update the `package.json` file. From npm version `8.3.2` the command to run is `$ npm update --save` or to always apply the save option add `save=true` to the `.npmrc` file.

## License
[BSD-2-Clause License](LICENSE)

## Author
[Qulle](https://github.com/qulle/)