<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { DrawingMode, Polyline, PolylinePoint, Transform } from '@annotorious/annotorious';
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
  let isClosable: boolean = false;

  // Keep track of the user keeping the finger in place
  let touchPauseTimer: ReturnType<typeof setTimeout> | undefined;

  const CLOSE_DISTANCE = 20;

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

      if (points.length >  2) {
        const d = distance(cursor, points[0]) * viewportScale;
        isClosable = d < CLOSE_DISTANCE;
      }

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

    const shape: Polyline = {
      type: ShapeType.POLYLINE, 
      geometry: {
        bounds: boundsFromPoints(p),
        points: p.map(point => ({
          type: 'CORNER',
          point
        } as PolylinePoint))
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

  $: pathString = coords.length > 0 ? 
    `M ${coords[0][0]},${coords[0][1]}` + 
    coords.slice(1).map(([x, y]) => ` L ${x},${y}`).join('') 
    : '';
</script>

<g class="a9s-annotation a9s-rubberband">
  {#if pathString}
    <path 
      class="a9s-outer"
      d={pathString} />

    <path 
      class="a9s-inner"
      d={pathString} />
        
    {#if isClosable}
      <circle 
        class="a9s-handle"
        cx={points[0][0]} 
        cy={points[0][1]} 
        r={handleRadius} />
    {/if}
  {/if}
</g>

<style>
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