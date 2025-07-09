<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Editor, Handle } from '@annotorious/annotorious/src';
  import { boundsFromPoints, computeSVGPath, isTouch } from '@annotorious/annotorious';
  import type { Polyline, PolylineGeometry, Shape, Transform } from '@annotorious/annotorious';

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

    if (idx === 0) {
      // Start handle cannot be selected
      selectedEnd = null;
    } else {
      const isSelected = selectedEnd === idx;
      if (isSelected) {
        // toggleSegment(idx - 1);
      } else {
        selectedEnd = idx;
      }
    }

    reclaimFocus();
  }

  /*
  const toggleSegment = (segmentIdx: number) => {
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
  };
  */

  const editor = (polyline: Shape, handle: string, delta: [number, number]) => {
    reclaimFocus();

    /*
    const geom = (polyline.geometry) as PolylineGeometry;

    const [dx, dy] = delta;

    let start: [number, number] = [...geom.start];
    let segments = [...geom.segments];

    if (handle === 'SHAPE') {
      start = [start[0] + dx, start[1] + dy];
      segments = segments.map(s => ({
        ...s,
        end: [s.end[0] + dx, s.end[1] + dy],
        cp1: s.cp1 ? [s.cp1[0] + dx, s.cp1[1] + dy] : undefined,
        cp2: s.cp2 ? [s.cp2[0] + dx, s.cp2[1] + dy] : undefined
      }));
    } else if (handle === 'START') {
      start = [start[0] + dx, start[1] + dy];
    } else if (handle.startsWith('END')) {
      try {
        const idx = parseInt(handle.split('-')[1]);
        
        segments = segments.map((s, i) => i === idx ? {
          ...s,
          end: [s.end[0] + dx, s.end[1] + dy],
          cp1: s.cp1 ? [s.cp1[0] + dx, s.cp1[1] + dy] : undefined,
          cp2: s.cp2 ? [s.cp2[0] + dx, s.cp2[1] + dy] : undefined
        } : s);
      } catch (error) {
        // Should never happen
        console.error(error);
      }
    }

    const points = [
      start,
      ...segments.reduce<[number, number][]>((all, s) => {
        const points = [s.cp1!, s.cp2!, s.end].filter(Boolean);
        return [...all, ...points];
      }, [])
    ];

    const bounds = boundsFromPoints(points);

    return {
      ...polyline,
      geometry: { bounds, start, segments, closed: geom.closed }
    } as Polyline;
    */

    return polyline;
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
      on:pointerdown={grab(`END-${idx}`)}
      on:pointerup={onHandlePointerUp(idx + 1)} />
  {/each}
</Editor>

<style>
  :global(.a9s-annotationlayer .a9s-annotation) path.polyline {
    fill: transparent;
  }
</style>