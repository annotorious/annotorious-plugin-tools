<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Editor, Handle } from '@annotorious/annotorious/src';
  import { approximateAsPolygon, boundsFromPoints, computeSVGPath, isTouch } from '@annotorious/annotorious';
  import type { Polyline, PolylineGeometry, PolylinePoint, Shape, Transform } from '@annotorious/annotorious';

  const dispatch = createEventDispatcher<{ change: Polyline }>();
  
  /** Time difference (milliseconds) required for registering a click/tap **/
  const CLICK_THRESHOLD = 250;

  /** Props */
  export let shape: Polyline;
  export let computedStyle: string | undefined;
  export let transform: Transform;
  export let viewportScale: number = 1;
  export let svgEl: SVGSVGElement;

  /** Drawing tool layer **/
  let isHandleHovered = false;
  let lastHandleClick: number | null = null;
  let selectedEnd: number | null = null;

  $: geom = shape.geometry;

  /** Handle hover state **/
  const onEnterHandle = () => isHandleHovered = true;
  const onLeaveHandle = () => isHandleHovered = false;

  /** 
   * SVG element keeps loosing focus when interacting with 
   * shapes–this function refocuses.
   */
  const reclaimFocus = () => {
    if (document.activeElement !== svgEl)
      svgEl.focus();
  }

  /**
   * De-selects all corners and reclaims focus.
   */
  const onShapePointerUp = () => {
    selectedEnd = null;
    reclaimFocus();
  }

  /**
   * Updates state, waiting for potential click.
   */
  const onHandlePointerDown = (evt: PointerEvent) => {
    isHandleHovered = true;

    evt.preventDefault();
    evt.stopPropagation();

    lastHandleClick = performance.now();
  }

  /** Selection handling logic **/
  const onHandlePointerUp = (idx: number) => (evt: PointerEvent) => {
    if (!lastHandleClick || isTouch) return;

    // Drag, not click
    if (performance.now() - lastHandleClick > CLICK_THRESHOLD) return;

    const isSelected = selectedEnd === idx;
    if (isSelected) {
      toggleSegment(idx);
    } else {
      selectedEnd = idx;
    }


    reclaimFocus();
  }

  const toggleSegment = (segmentIdx: number) => {
    /*
    const segment = geom.segments[segmentIdx];
    
    if (segment.type === 'LINE') {
      // Convert to curve with default control points
      const prevCorner = segmentIdx === 0 ? geom.start : geom.segments[segmentIdx - 1].end;
      
      const dx = segment.end[0] - prevCorner[0];
      const dy = segment.end[1] - prevCorner[1];
      
      const cp1: [number, number] = [prevCorner[0] + dx * 0.33, prevCorner[1] + dy * 0.33];
      const cp2: [number, number] = [prevCorner[0] + dx * 0.67, prevCorner[1] + dy * 0.67];

      const polyline: Polyline = {
        ...shape,
        geometry: {
          ...geom,
          segments: geom.segments.map((s, i) => i === segmentIdx ? {
            type: 'CURVE',
            end: s.end,
            cp1, cp2
          } as PolylineSegment : s)
        }
      }
      
      dispatch('change', polyline);
    } else {
      const polyline: Polyline = {
        ...shape,
        geometry: {
          ...geom,
          segments: geom.segments.map((s, i) => i === segmentIdx ? {
            type: 'LINE',
            end: s.end
          } as PolylineSegment : s)
        }
      }

      dispatch('change', polyline);
    }
    */
  };

  const editor = (polyline: Shape, handle: string, delta: [number, number]) => {
    reclaimFocus();

    const geom = (polyline.geometry) as PolylineGeometry;

    const [dx, dy] = delta;

    let points: PolylinePoint[];

    if (handle === 'SHAPE') {
      points = geom.points.map(pt => ({
        ...pt,
        point: [pt.point[0] + dx, pt.point[1] + dy],
        inHandle: pt.inHandle ? [pt.inHandle[0] + dx, pt.inHandle[1] + dy] : undefined,
        outHandle: pt.outHandle ? [pt.outHandle[0] + dx, pt.outHandle[1] + dy] : undefined
      }));
    } else {
      try {
        const idx = parseInt(handle.split('-')[1]);
        
        points = geom.points.map((pt, i) => i === idx ? {
          ...pt,
          point: [pt.point[0] + dx, pt.point[1] + dy],
          inHandle: pt.inHandle ? [pt.inHandle[0] + dx, pt.inHandle[1] + dy] : undefined,
          outHandle: pt.outHandle ? [pt.outHandle[0] + dx, pt.outHandle[1] + dy] : undefined
        } : pt);
      } catch (error) {
        // Should never happen
        console.error(error);
        points = geom.points;
      }
    }

    const bounds = boundsFromPoints(approximateAsPolygon(geom));

    return {
      ...polyline,
      geometry: {
        bounds,
        points,
        closed: geom.closed
      }
    } as Polyline;
  }

  $: d = computeSVGPath(geom);
</script>

<Editor
  shape={shape}
  transform={transform}
  editor={editor}
  svgEl={svgEl}
  on:change 
  on:grab
  on:release
  let:grab={grab}>

  <path
    class="a9s-outer polyline"
    on:pointerup={onShapePointerUp}
    on:pointerdown={grab('SHAPE')}
    d={d} />

  <path
    class="a9s-inner polyline a9s-shape-handle"
    style={computedStyle}
    on:pointerup={onShapePointerUp}
    on:pointerdown={grab('SHAPE')}
    d={d} />

  <!-- segment end handles -->
  {#each geom.points as pt, idx}
    <Handle 
      class="a9s-corner-handle"
      x={pt.point[0]}
      y={pt.point[1]}
      scale={viewportScale}
      on:pointerenter={onEnterHandle}
      on:pointerleave={onLeaveHandle}
      on:pointerdown={onHandlePointerDown}
      on:pointerdown={grab(`CORNER-${idx}`)}
      on:pointerup={onHandlePointerUp(idx)} />
  {/each}
</Editor>

<style>
  :global(.a9s-annotationlayer .a9s-annotation) path.polyline {
    fill: transparent;
  }
</style>