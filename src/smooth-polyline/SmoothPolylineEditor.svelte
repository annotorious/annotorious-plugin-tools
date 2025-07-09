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
      toggleCorner(idx);
    } else {
      selectedEnd = idx;
    }


    reclaimFocus();
  }

  /**
   * Calculate the tangent direction at a point for smooth curve creation
   */
  const calculateTangentDirection = (points: PolylinePoint[], index: number, closed: boolean): [number, number] => {
    const currentPoint = points[index];
    const prevIdx = index === 0 ? (closed ? points.length - 1 : null) : index - 1;
    const nextIdx = index === points.length - 1 ? (closed ? 0 : null) : index + 1;

    let tangentX = 0;
    let tangentY = 0;

    // Calculate tangent based on neighboring points
    if (prevIdx !== null && nextIdx !== null) {
      // Middle point - use direction from previous to next point
      const prevPoint = points[prevIdx].point;
      const nextPoint = points[nextIdx].point;
      tangentX = nextPoint[0] - prevPoint[0];
      tangentY = nextPoint[1] - prevPoint[1];
    } else if (prevIdx !== null) {
      // End point - use direction from previous point
      const prevPoint = points[prevIdx].point;
      tangentX = currentPoint.point[0] - prevPoint[0];
      tangentY = currentPoint.point[1] - prevPoint[1];
    } else if (nextIdx !== null) {
      // Start point - use direction to next point
      const nextPoint = points[nextIdx].point;
      tangentX = nextPoint[0] - currentPoint.point[0];
      tangentY = nextPoint[1] - currentPoint.point[1];
    }

    // Normalize and scale the tangent
    const length = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
    if (length > 0) {
      const factor = Math.min(length * 0.3, 60); // Control handle distance
      tangentX = (tangentX / length) * factor;
      tangentY = (tangentY / length) * factor;
    }

    return [tangentX, tangentY];
  }

  const toggleCorner = (cornerIdx: number) => {
    const corner = geom.points[cornerIdx];
    
    if (corner.type === 'CORNER') {
      // Convert to curve - create symmetric control points for smooth curve
      const [tangentX, tangentY] = calculateTangentDirection(geom.points, cornerIdx, Boolean(geom.closed));
      
      const currPoint = corner.point;

      const inHandle: [number, number] = [
        currPoint[0] - tangentX,
        currPoint[1] - tangentY
      ];

      const outHandle: [number, number] = [
        currPoint[0] + tangentX,
        currPoint[1] + tangentY
      ];

      const polyline: Polyline = {
        ...shape,
        geometry: {
          ...geom,
          points: geom.points.map((pt, i) => i === cornerIdx ? {
            ...pt,
            type: 'CURVE',
            inHandle,
            outHandle
          } as PolylinePoint : pt)
        }
      };
      
      dispatch('change', polyline);
    } else {
      const polyline: Polyline = {
        ...shape,
        geometry: {
          ...geom,
          points: geom.points.map((pt, i) => i === cornerIdx ? {
            ...pt,
            type: 'CORNER'
          } as PolylinePoint : pt)
        }
      }

      dispatch('change', polyline);
    }
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
    } else if (handle.startsWith('CORNER-')) {
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
    } else if (handle.startsWith('IN-') || handle.startsWith('OUT-')) {
      const [handleType, idxStr] = handle.split('-');
      const idx = parseInt(idxStr);
      
      points = geom.points.map((pt, i) => {
        if (i === idx && pt.type === 'CURVE') {
          const newPt = { ...pt };
          
          if (handleType === 'IN' && pt.inHandle) {
            newPt.inHandle = [pt.inHandle[0] + dx, pt.inHandle[1] + dy];
            
            // Optional: maintain symmetry for smooth curves
            if (pt.outHandle) {
              const inDx = newPt.inHandle[0] - pt.point[0];
              const inDy = newPt.inHandle[1] - pt.point[1];
              const inLength = Math.sqrt(inDx * inDx + inDy * inDy);
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
            
            // Optional: maintain symmetry for smooth curves
            if (pt.inHandle) {
              const outDx = newPt.outHandle[0] - pt.point[0];
              const outDy = newPt.outHandle[1] - pt.point[1];
              const outLength = Math.sqrt(outDx * outDx + outDy * outDy);
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

  <!-- Control handles for curve points -->
  {#each geom.points as pt, idx}
    {#if pt.type === 'CURVE'}
      {#if pt.inHandle}
        <Handle 
          class="a9s-control-handle a9s-in-handle"
          x={pt.inHandle[0]}
          y={pt.inHandle[1]}
          scale={viewportScale}
          on:pointerdown={grab(`IN-${idx}`)} />
        
        <!-- Control line -->
        <line
          class="a9s-control-line"
          x1={pt.point[0]}
          y1={pt.point[1]}
          x2={pt.inHandle[0]}
          y2={pt.inHandle[1]}
          stroke="#666"
          stroke-width="1"
          stroke-dasharray="2,2" />
      {/if}
      
      {#if pt.outHandle}
        <Handle 
          class="a9s-control-handle a9s-out-handle"
          x={pt.outHandle[0]}
          y={pt.outHandle[1]}
          scale={viewportScale}
          on:pointerdown={grab(`OUT-${idx}`)} />
        
        <!-- Control line -->
        <line
          class="a9s-control-line"
          x1={pt.point[0]}
          y1={pt.point[1]}
          x2={pt.outHandle[0]}
          y2={pt.outHandle[1]}
          stroke="#666"
          stroke-width="1"
          stroke-dasharray="2,2" />
      {/if}
    {/if}
  {/each}
</Editor>

<style>
  :global(.a9s-annotationlayer .a9s-annotation) path.polyline {
    fill: transparent;
  }
</style>