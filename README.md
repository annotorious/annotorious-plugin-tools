# Annotorious Tools Plugin

Additional drawing tools for Annotorious:

* **Ellipse**: draw ellipse or circle shapes. Hold `SHIFT` to constrain the aspect ratio to a circle. Hold `CTRL` to drag the circle from the center.
* **Line**: a simple line between two points.
* **Path**: draw polylines with a mix of straight and curve segments.

## Installation

```sh
npm install @annotorious/plugin-tools
```

## Use

This plugin works with both Annotorious versions, for images and OpenSeadragon.

### Image Version

```js
import { createImageAnnotator } from '@annotorious/annotorious';
import { mountPlugin as mountToolsPlugin } from '@annotorious/plugin-tools';

import '@annotorious/annotorious/annotorious.css';
import '@annotorious/plugin-tools/annotorious-plugin-tools.css';

var anno = createImageAnnotator('sample-image', {
  /** Annotorious init options **/
});

mountToolsPlugin(anno);

// ['rectangle', 'polygon', 'ellipse', 'line', 'path']
console.log(anno.listDrawingTools());

anno.setDrawingTool('path');
```

### OpenSeadragon Version

```js
import OpenSeadragon from 'openseadragon';
import { createOSDAnnotator } from '@annotorious/openseadragon';
import { mountPlugin as mountToolsPlugin } from '../src';

import '@annotorious/openseadragon/annotorious-openseadragon.css';
import '@annotorious/plugin-tools/annotorious-plugin-tools.css';

const viewer = OpenSeadragon({
  /** OpenSeadragon init options **/
});

const anno = createOSDAnnotator(viewer, {
  /** Annotorious init options **/
});

mountToolsPlugin(anno);

// ['rectangle', 'polygon', 'ellipse', 'line', 'path']
console.log(anno.listDrawingTools());

anno.setDrawingTool('path');
```


