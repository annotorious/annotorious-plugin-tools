<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Editor, Handle } from '@annotorious/annotorious/src';
  import { approximateAsPolygon, boundsFromPoints, computeSVGPath, isTouch } from '@annotorious/annotorious';
  import type { Polyline, PolylineGeometry, PolylinePoint, Shape, Transform } from '@annotorious/annotorious';
  import { togglePolylineCorner } from './pathUtils';
  import BezierHandle from './BezierHandle.svelte';

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
  let selectedCorner: number | null = null;

  $: geom = shape.geometry;

  /** Handle hover state **/
  const onEnterHandle = () => isHandleHovered = true;
  const onLeaveHandle = () => isHandleHovered = false;

  const onShapePointerUp = () => selectedCorner = null;

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

    // Click on a CORNER instantly selects and converts to curve
    const { type } = geom.points[idx];
    if (type === 'CORNER') {
      selectedCorner = idx;

      const polyline = togglePolylineCorner(shape, idx, viewportScale);
      dispatch('change', polyline);
    } else {
      const isSelected = selectedCorner === idx;
      if (isSelected) {
        // If already selected, toggle to corner
        const polyline = togglePolylineCorner(shape, idx,viewportScale);
        dispatch('change', polyline);
      } else {
        // Just select
        selectedCorner = idx;
      }
    }
  }

  const editor = (polyline: Shape, handle: string, delta: [number, number]) => {
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
    } else if (handle.startsWith('CORNER-')) {
      const idx = parseInt(handle.split('-')[1]);
      
      points = geom.points.map((pt, i) => i === idx ? {
        ...pt,
        point: [pt.point[0] + dx, pt.point[1] + dy],
        inHandle: pt.inHandle ? [pt.inHandle[0] + dx, pt.inHandle[1] + dy] : undefined,
        outHandle: pt.outHandle ? [pt.outHandle[0] + dx, pt.outHandle[1] + dy] : undefined
      } : pt);
    } else if (handle.startsWith('IN-') || handle.startsWith('OUT-')) {
      const [handleType, idxStr] = handle.split('-');
      const idx = parseInt(idxStr);
      
      points = geom.points.map((pt, i) => {
        if (i === idx && pt.type === 'CURVE') {
          const newPt = { ...pt };
          
          if (handleType === 'IN' && pt.inHandle) {
            newPt.inHandle = [pt.inHandle[0] + dx, pt.inHandle[1] + dy];
            
            // Maintain symmetry for smooth curves
            if (pt.outHandle) {
              const inDx = newPt.inHandle[0] - pt.point[0];
              const inDy = newPt.inHandle[1] - pt.point[1];
              const inLength = Math.sqrt(inDx ** 2 + inDy ** 2);

              const outLength = Math.sqrt(
                (pt.outHandle[0] - pt.point[0]) ** 2 + 
                (pt.outHandle[1] - pt.point[1]) ** 2
              );
              
              if (inLength > 0) {
                newPt.outHandle = [
                  pt.point[0] - (inDx / inLength) * outLength,
                  pt.point[1] - (inDy / inLength) * outLength
                ];
              }
            }
          } else if (handleType === 'OUT' && pt.outHandle) {
            newPt.outHandle = [pt.outHandle[0] + dx, pt.outHandle[1] + dy];
            
            // Maintain symmetry for smooth curves
            if (pt.inHandle) {
              const outDx = newPt.outHandle[0] - pt.point[0];
              const outDy = newPt.outHandle[1] - pt.point[1];
              const outLength = Math.sqrt(outDx ** 2 + outDy ** 2);

              const inLength = Math.sqrt(
                (pt.inHandle[0] - pt.point[0]) ** 2 + 
                (pt.inHandle[1] - pt.point[1]) ** 2
              );
              
              if (outLength > 0) {
                newPt.inHandle = [
                  pt.point[0] - (outDx / outLength) * inLength,
                  pt.point[1] - (outDy / outLength) * inLength
                ];
              }
            }
          }
          
          return newPt;
        }

        return pt;
      });
    } else {   
      // Should never happen
      points = geom.points;
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

  <!-- Bezier handles only on the selected corner -->
  {#if selectedCorner !== null}
    {@const corner = geom.points[selectedCorner]}
    {#if corner.type === 'CURVE'}
      {#if corner.inHandle}
        <BezierHandle
          corner={corner.point}
          controlPoint={corner.inHandle}
          viewportScale={viewportScale}
          on:pointerdown={grab(`IN-${selectedCorner}`)} />
      {/if}

      {#if corner.outHandle}
        <BezierHandle
          corner={corner.point}
          controlPoint={corner.outHandle}
          viewportScale={viewportScale}
          on:pointerdown={grab(`OUT-${selectedCorner}`)} />
      {/if}
    {/if}
  {/if}

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