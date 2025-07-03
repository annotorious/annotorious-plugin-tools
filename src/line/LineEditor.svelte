<script lang="ts">
  import { Editor, Handle } from '@annotorious/annotorious/src';
  import { boundsFromPoints } from '@annotorious/annotorious';
  import type { Line, LineGeometry, Shape, Transform } from '@annotorious/annotorious';

  export let shape: Line;
  export let computedStyle: string | undefined;
  export let transform: Transform;
  export let viewportScale: number = 1;
  export let svgEl: SVGSVGElement;

  $: geom = shape.geometry;

  const editor = (line: Shape, handle: string, delta: [number, number]) => {
    const geom = line.geometry as LineGeometry;
    let [[x1, y1], [x2, y2]] = geom.points;

    const [dx, dy] = delta;

    if (handle === 'LINE') {
      x1 += dx;
      x2 += dx;
      y1 += dy;
      y2 += dy;
    } else {
      switch (handle) {
        case 'POINT1': {
          x1 += dx;
          y1 += dy;
          break;
        }

        case 'POINT2': {
          x2 += dx;
          y2 += dy;
          break;
        }
      }
    }

    return {
      ...line,
      geometry: {
        ...line.geometry,
        points: [[x1, y1], [x2, y2]],
        bounds: boundsFromPoints([[x1, y1], [x2, y2]])
      }
    };
  }

</script>

<Editor
  shape={shape}
  transform={transform}
  editor={editor}
  svgEl={svgEl}
  on:grab
  on:change
  on:release
  let:grab={grab}>

  <line
    class="a9s-outer"
    on:pointerdown={grab('LINE')}
    x1={geom.points[0][0]} y1={geom.points[0][1]} x2={geom.points[1][0]} y2={geom.points[1][1]} />

  <line
    class="a9s-inner a9s-shape-handle"
    style={computedStyle}
    on:pointerdown={grab('LINE')}
    x1={geom.points[0][0]} y1={geom.points[0][1]} x2={geom.points[1][0]} y2={geom.points[1][1]} />

  <Handle
    class="a9s-line-point-1"
    on:pointerdown={grab('POINT1')}
    x={geom.points[0][0]} y={geom.points[0][1]}
    scale={viewportScale} />

  <Handle
    class="a9s-line-point-2"
    on:pointerdown={grab('POINT2')}
    x={geom.points[1][0]} y={geom.points[1][1]}
    scale={viewportScale} />

</Editor>