<script lang="ts">
  import { Editor, Handle } from '@annotorious/annotorious/src';
  import { getMaskDimensions } from '@annotorious/annotorious';
  import type { Line, LineGeometry, Shape, Transform } from '@annotorious/annotorious';

  export let shape: Line;
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
        bounds: {
          minX: Math.min(x1, x2),
          minY: Math.min(y1, y2),
          maxX: Math.max(x1, x2),
          maxY: Math.max(y1, y2)
        }
      }
    };
  }

  $: mask = getMaskDimensions(geom.bounds, 2 / viewportScale);
  const maskId = `line-mask-${Math.random().toString(36).substring(2, 12)}`;
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
  <defs>
    <mask id={maskId} class="a9s-line-editor-mask">
      <rect x={mask.x} y={mask.y} width={mask.w} height={mask.h} />
      <line x1={geom.points[0][0]} y1={geom.points[0][1]} x2={geom.points[1][0]} y2={geom.points[1][1]} />
    </mask>
  </defs>

  <line
    class="a9s-outer"
    mask={`url(#${maskId})`}
    on:pointerdown={grab('LINE')}
    x1={geom.points[0][0]} y1={geom.points[0][1]} x2={geom.points[1][0]} y2={geom.points[1][1]} />

  <line
    class="a9s-inner a9s-shape-handle"
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

<style>
  mask.a9s-line-editor-mask > rect {
    fill: #fff;
  }

  mask.a9s-line-editor-mask > line {
    fill: #000;
  }
</style>