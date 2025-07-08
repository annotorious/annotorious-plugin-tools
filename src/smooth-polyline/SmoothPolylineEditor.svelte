<script lang="ts">
  import { Editor, Handle } from '@annotorious/annotorious/src';
  import { boundsFromPoints, isTouch } from '@annotorious/annotorious';
  import type { Polyline, PolylineGeometry, Shape, Transform } from '@annotorious/annotorious';

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
    selectedCorner = null;
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

    const isSelected = selectedCorner === idx;
    if (isSelected)
      selectedCorner = null;
    else
      selectedCorner = idx;

    reclaimFocus();
  }

  const editor = (polyline: Shape, handle: string, delta: [number, number]) => {
    reclaimFocus();

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
  }

  const computePath = (geom: PolylineGeometry) => {
    const { start, segments } = geom;
    
    let path = `M ${start[0]},${start[1]}`;
    
    segments.forEach(s => {
      if (s.type === 'LINE') {
        path += ` L ${s.end[0]},${s.end[1]}`;
      } else if (s.type === 'CURVE' && s.cp1 && s.cp2) {
        path += ` C ${s.cp1[0]},${s.cp1[1]} ${s.cp2[0]},${s.cp2[1]} ${s.end[0]},${s.end[1]}`;
      }
    });
    
    return path;
  }

  $: d = computePath(geom);
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

  <!-- Start handle -->
  <Handle 
    class="a9s-corner-handle"
    x={geom.start[0]}
    y={geom.start[1]}
    scale={viewportScale}
    on:pointerenter={onEnterHandle}
    on:pointerleave={onLeaveHandle}
    on:pointerdown={onHandlePointerDown}
    on:pointerdown={grab('START')}
    on:pointerup={onHandlePointerUp(0)} />

  <!-- segment end handles -->
  {#each geom.segments as segment, idx}
    <Handle 
      class="a9s-corner-handle"
      x={segment.end[0]}
      y={segment.end[1]}
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