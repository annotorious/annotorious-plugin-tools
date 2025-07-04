<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { DrawingMode, Polyline, PolylineSegment, Transform } from '@annotorious/annotorious';
  import { boundsFromPoints, distance, getMaskDimensions, ShapeType } from '@annotorious/annotorious';

  const dispatch = createEventDispatcher<{ create: Polyline }>();

  /** Props **/
  export let addEventListener: (type: string, fn: EventListener, capture?: boolean) => void;
  export let drawingMode: DrawingMode;
  export let transform: Transform;
  export let viewportScale = 1;

  let lastPointerDown: { timeStamp: number, offsetX: number, offsetY: number };

  let points: [number, number][] = [];
  
  let cursor: [number, number] | undefined;

  // Keep track of the user keeping the finger in place
  let touchPauseTimer: ReturnType<typeof setTimeout> | undefined;

  const TOUCH_PAUSE_LIMIT = 1500;

  $: handleRadius = 4 / viewportScale;

  const onPointerDown = (event: Event) => {
    const evt = event as PointerEvent;

    // Note that the event itself is ephemeral!
    const { timeStamp, offsetX, offsetY } = evt;
    lastPointerDown = { timeStamp, offsetX, offsetY };

    if (drawingMode === 'drag') {
      if (points.length === 0) {
        const point = transform.elementToImage(evt.offsetX, evt.offsetY);
        points.push(point);

        cursor = point;
      }
    }
  }

  const onPointerMove = (event: Event) => {
    const evt = event as PointerEvent;

    if (touchPauseTimer) clearTimeout(touchPauseTimer);

    if (points.length > 0) {
      cursor = transform.elementToImage(evt.offsetX, evt.offsetY);

      if (evt.pointerType === 'touch') {
        touchPauseTimer = setTimeout(() => {
          onDblClick();
        }, TOUCH_PAUSE_LIMIT);
      }
    }
  }

  const onPointerUp = (event: Event) => {
    const evt = event as PointerEvent;

    if (touchPauseTimer) clearTimeout(touchPauseTimer);

    if (drawingMode === 'click') {
      const timeDifference = evt.timeStamp - lastPointerDown.timeStamp;

      const d = distance(
        [lastPointerDown.offsetX, lastPointerDown.offsetY], 
        [evt.offsetX, evt.offsetY]);

      if (timeDifference > 300 || d > 15) // Not a single click - ignore
        return;

      if (points.length === 0) {
        // Start drawing
        const point = transform.elementToImage(evt.offsetX, evt.offsetY);
        points.push(point);

        cursor = point;
      } else {
        points.push(cursor!);
      }
    } else {
      // Require minimum drag of 4px
      if (points.length === 1) {
        const dist = distance(points[0], cursor!);

        if (dist <= 4) {
          // Cancel
          points = [];
          cursor = undefined;

          return;
        }
      }

      // Stop click event from propagating if we're drawing
      evt.stopImmediatePropagation();

      points.push(cursor!);
    }
  }

  const onDblClick = () => {    
    if (!cursor) return;

    // Require min 2 points for a polyline
    // Note that the double click will have added a duplicate point!
    const p = points.slice(0, -1);
    if (p.length < 2) return;

    const [start, ...pts] = p;

    const shape: Polyline = {
      type: ShapeType.POLYLINE, 
      geometry: {
        bounds: boundsFromPoints(p),
        start,
        segments: pts.map(pt => ({
          type: 'LINE',
          end: pt
        } as PolylineSegment))
      }
    }

    points = [];
    cursor = undefined;
    
    dispatch('create', shape);
  }

  onMount(() => {
    addEventListener('pointerdown', onPointerDown, true);
    addEventListener('pointermove', onPointerMove);
    addEventListener('pointerup', onPointerUp, true);
    addEventListener('dblclick', onDblClick, true);
  });

  $: coords = cursor ? [...points, cursor] : points;

  $: mask = coords.length > 0 ? getMaskDimensions(boundsFromPoints(coords), 2 / viewportScale) : undefined;

  // Generate SVG path string from points
  $: pathString = coords.length > 0 ? 
    `M ${coords[0][0]},${coords[0][1]}` + 
    coords.slice(1).map(([x, y]) => ` L ${x},${y}`).join('') 
    : '';

  const maskId = `polyline-mask-${Math.random().toString(36).substring(2, 12)}`;
</script>

<g class="a9s-annotation a9s-rubberband">
  {#if mask && pathString}
    <defs>
      <mask id={maskId} class="a9s-rubberband-polyline-mask">
        <rect x={mask.x} y={mask.y} width={mask.w} height={mask.h} fill="white" />
        <path d={pathString} stroke="black" stroke-width="2" fill="none" />
      </mask>
    </defs>

    <!-- Outer stroke for the selection effect -->
    <path 
      class="a9s-outer"
      mask={`url(#${maskId})`}
      d={pathString} />

    <!-- Inner polyline -->
    <path 
      class="a9s-inner"
      d={pathString} />
        
    <!-- Point handles -->
    {#each points as point}
      <circle 
        class="a9s-handle"
        cx={point[0]} 
        cy={point[1]} 
        r={handleRadius} />
    {/each}
  {/if}
</g>

<style>
  mask.a9s-rubberband-polyline-mask > rect {
    fill: #fff;
  }

  mask.a9s-rubberband-polyline-mask > path {
    stroke: #000;
    stroke-width: 2;
    fill: none;
  }

  path.a9s-outer {
    stroke: rgba(0, 0, 0, 0.35);
    stroke-width: 8px;
    fill: none;
    vector-effect: non-scaling-stroke;
  }

  path.a9s-inner {
    stroke: #fff;
    stroke-width: 2px;
    fill: none;
    vector-effect: non-scaling-stroke;
  }

  circle.a9s-handle {
    fill: #fff;
    pointer-events: none;
    stroke: rgba(0, 0, 0, 0.35);
    stroke-width: 1px;
    vector-effect: non-scaling-stroke;
  }
</style>