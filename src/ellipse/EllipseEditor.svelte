<script lang="ts">
  import { Editor, Handle } from '@annotorious/annotorious/src';
  import type { Ellipse, Shape, Transform } from '@annotorious/annotorious';
  
  export let shape: Ellipse;

  export let transform: Transform;

  export let viewportScale: number = 1;

  $: geom = shape.geometry;

  $: handleSize = 10 / viewportScale;

  const editor = (ellipse: Shape, handle: string, delta: [number, number]) => {
    const initialBounds = ellipse.geometry.bounds;

    let [x0, y0] = [initialBounds.minX, initialBounds.minY];
    let [x1, y1] = [initialBounds.maxX, initialBounds.maxY];

    const [dx, dy] = delta;

    if (handle === 'SHAPE') {
      x0 += dx;
      x1 += dx;
      y0 += dy;
      y1 += dy;
    } else {
      switch (handle) {
        case 'TOP': {
          y0 += dy;
          break;
        }

        case 'BOTTOM': {
          y1 += dy;
          break;
        }

        case 'LEFT': {
          x0 += dx;
          break;
        }

        case 'RIGHT': {
          x1 += dx;
          break;
        }
      }
    }

    const x = Math.min(x0, x1);
    const y = Math.min(y0, y1);
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);

    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;

    const rx = w / 2;
    const ry = h / 2;

    return {
      ...ellipse,
      geometry: {
        ...ellipse.geometry,
        cx, cy, rx, ry,
        bounds: {
          minX: x,
          minY: y,
          maxX: x + w,
          maxY: y + h
        }
      }
    };
  }
</script>

<Editor
  shape={shape}
  transform={transform}
  editor={editor}
  on:grab
  on:change 
  on:release
  let:grab={grab}>

  <ellipse 
    class="a9s-outer"
    on:pointerdown={grab('SHAPE')}
    cx={geom.cx} cy={geom.cy} rx={geom.rx} ry={geom.ry} />

  <ellipse 
    class="a9s-inner a9s-shape-handle"
    on:pointerdown={grab('SHAPE')}
    cx={geom.cx} cy={geom.cy} rx={geom.rx} ry={geom.ry} />

  <Handle 
    class="a9s-corner-top"
    on:pointerdown={grab('TOP')}
    x={geom.cx} y={geom.cy - geom.ry} 
    scale={viewportScale} />

  <Handle 
    class="a9s-corner-handle-right"
    on:pointerdown={grab('RIGHT')}
    x={geom.cx + geom.rx} y={geom.cy} 
    scale={viewportScale} />
  
  <Handle 
    class="a9s-corner-handle-bottom"
    on:pointerdown={grab('BOTTOM')}
    x={geom.cx} y={geom.cy + geom.ry} 
    scale={viewportScale} />
    
  <Handle 
    class="a9s-corner-handle-left"
    on:pointerdown={grab('LEFT')}
    x={geom.cx - geom.rx} y={geom.cy} 
    scale={viewportScale} />
</Editor>