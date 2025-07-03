<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { ShapeType } from '@annotorious/annotorious';
  import { boundsFromPoints, distance } from '@annotorious/annotorious';
  import type { Line, DrawingMode, Transform } from '@annotorious/annotorious';

  const dispatch = createEventDispatcher<{ create: Line }>();
  
  /** Props **/
  export let addEventListener: (type: string, fn: EventListener, capture?: boolean) => void;
  export let drawingMode: DrawingMode
  export let transform: Transform;
  export let viewportScale: number;
  
  let container: SVGGElement;

  let origin: [x: number, y: number] | undefined; 

  let cursor: [number, number] | undefined;

  let x1: number, y1: number, x2: number, y2: number;

  let lastPointerDown: { timeStamp: number, offsetX: number, offsetY: number };

  let lastMoveEvent: PointerEvent | undefined;

  const onPointerDown = (event: Event) => {
    const evt = event as PointerEvent;

    // Note that the event itself is ephemeral!
    const { timeStamp, offsetX, offsetY } = evt;
    lastPointerDown = { timeStamp, offsetX, offsetY };

    if (drawingMode === 'drag') {
      origin = transform.elementToImage(evt.offsetX, evt.offsetY);
      cursor = origin;

      x1 = origin[0];
      y1 = origin[1];
      x2 = cursor[0];
      y2 = cursor[1];
    }
  }

  const updateShape = (maybeEvent?: Event) => {
    const evt = (maybeEvent as PointerEvent) || lastMoveEvent;

    if (origin) {
      cursor = transform.elementToImage(evt!.offsetX, evt!.offsetY);

      // TODO: implement snapping to 45 degree increments while shift is pressed

      x2 = cursor[0];
      y2 = cursor[1];
    }

    if (maybeEvent)
      lastMoveEvent = maybeEvent as PointerEvent;
  }
    
  const onPointerUp = (event: Event) => {
    const evt = event as PointerEvent;
    
    if (drawingMode === 'click') {
      const timeDifference = performance.now() - lastPointerDown.timeStamp;

      const d = distance(
        [lastPointerDown.offsetX, lastPointerDown.offsetY], 
        [evt.offsetX, evt.offsetY]);

      if (timeDifference > 300 || d > 15) // Not a single click - ignore
        return;

      if (origin) {
        stopDrawing();
      } else {
        // Start drawing
        origin = transform.elementToImage(evt.offsetX, evt.offsetY);
        cursor = origin;

        x1 = origin[0];
        y1 = origin[1];
        x2 = cursor[0];
        y2 = cursor[1];
      }
    } else if (origin) {
      evt.stopPropagation();
      stopDrawing();
    }
  }

  const stopDrawing = () => {
    // Require 4 pixels minimum
    if (origin && cursor && distance(origin, cursor) > 4) {
      const shape: Line = {
        type: ShapeType.LINE, 
        geometry: {
          bounds: boundsFromPoints([origin, cursor]),
          points: [origin, cursor]
        }
      }

      dispatch('create', shape);
    }

    origin = undefined;
    cursor = undefined;

    lastMoveEvent = undefined;
  }

  onMount(() => {
    addEventListener('pointerdown', onPointerDown, true);
    addEventListener('pointermove', updateShape);
    addEventListener('pointerup', onPointerUp, true);
  });

</script>

<g 
  bind:this={container}
  class="a9s-annotation a9s-rubberband">
  
  {#if origin && cursor}
    <line 
      class="a9s-outer"
      x1={x1} y1={y1} x2={x2} y2={y2} />

    <line 
      class="a9s-inner"
      x1={x1} y1={y1} x2={x2} y2={y2} />
  {/if}
</g>