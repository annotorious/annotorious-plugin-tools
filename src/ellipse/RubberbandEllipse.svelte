<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { ShapeType } from '@annotorious/annotorious';
  import type { Ellipse, DrawingMode, Transform } from '@annotorious/annotorious';

  const dispatch = createEventDispatcher<{ create: Ellipse }>();
  
  /** Props **/
  export let addEventListener: (type: string, fn: EventListener, capture?: boolean) => void;
  export let drawingMode: DrawingMode
  export let transform: Transform;
  
  let container: SVGGElement;

  let origin: [x: number, y: number] | undefined; 

  let anchor: [number, number] | undefined;

  let x: number, y: number, w: number, h: number;

  let isShiftPressed = false;

  let isCtrlPressed = false;

  let lastPointerDown: number;

  let lastMoveEvent: PointerEvent | undefined;

  const onPointerDown = (event: Event) => {
    const evt = event as PointerEvent;

    lastPointerDown = performance.now();

    if (drawingMode === 'drag') {
      origin = transform.elementToImage(evt.offsetX, evt.offsetY);
      anchor = origin;

      x = origin[0];
      y = origin[1];
      w = 1;
      h = 1;
    }
  }

  const updateShape = (maybeEvent?: Event) => {
    const evt = (maybeEvent as PointerEvent)|| lastMoveEvent;

    if (origin) {
      anchor = transform.elementToImage(evt!.offsetX, evt!.offsetY);

      if (isCtrlPressed) {
        const mw = 2 * Math.abs(anchor[0] - origin[0]);
        const mh = 2 * Math.abs(anchor[1] - origin[1]);

        w = isShiftPressed ? Math.max(mw, mh) : mw;
        h = isShiftPressed ? w : mh;

        x = Math.min(anchor[0], origin[0] - w / 2);
        y = Math.min(anchor[1], origin[1] - h / 2);
      } else {
        const mw = Math.abs(anchor[0] - origin[0]);
        const mh = Math.abs(anchor[1] - origin[1]);

        w = isShiftPressed ? Math.max(mw, mh) : mw;
        h = isShiftPressed ? w : mh;

        x = Math.min(anchor[0], origin[0]);
        y = Math.min(anchor[1], origin[1]);
      }
    }

    if (maybeEvent)
      lastMoveEvent = maybeEvent as PointerEvent;
  }
    
  const onPointerUp = (event: Event) => {
    const evt = event as PointerEvent;
    
    if (drawingMode === 'click')
      evt.stopImmediatePropagation();

    const timeDifference = performance.now() - lastPointerDown;

    if (drawingMode === 'click') {
      // Not a single click - ignore
      if (timeDifference > 300)
        return;

      evt.stopPropagation();

      if (origin) {
        stopDrawing();
      } else {
        // Start drawing
        origin = transform.elementToImage(evt.offsetX, evt.offsetY);
        anchor = origin;

        x = origin[0];
        y = origin[1];
        w = 1;
        h = 1;
      }
    } else if (origin) {
      if (timeDifference > 300 || w * h > 100) {
        evt.stopPropagation();
        stopDrawing();
      } else {
        origin = undefined;
        anchor = undefined;

        lastMoveEvent = undefined;
      }
    }
  }

  const stopDrawing = () => {
    // Require 4x4 pixels minimum
    if (w * h > 15) {
      const shape: Ellipse = {
        type: ShapeType.ELLIPSE, 
        geometry: {
          bounds: {
            minX: x, 
            minY: y,
            maxX: x + w,
            maxY: y + h
          },
          cx: x + w / 2,
          cy: y + h / 2,
          rx: w / 2,
          ry: h / 2
        }
      }

      dispatch('create', shape);
    }

    origin = undefined;
    anchor = undefined;

    lastMoveEvent = undefined;
  }

  const onKeyDown = (evt: KeyboardEvent) => {
    if (evt.key === 'Shift') {
      isShiftPressed = true;  
      updateShape();  
    }

    if (evt.key === 'Control') {
      isCtrlPressed = true;
      updateShape();
    }
  }

  const onKeyUp = (evt: KeyboardEvent) => {
    if (evt.key === 'Shift') {
      isShiftPressed = false;
      updateShape();  
    }

    if (evt.key === 'Control') {
      isCtrlPressed = false;
      updateShape();  
    }
  }

  onMount(() => {
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('keydown', onKeyDown);

    addEventListener('pointerdown', onPointerDown);
    addEventListener('pointermove', updateShape);
    addEventListener('pointerup', onPointerUp);

    return () => {
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('keydown', onKeyDown);
    }
  });
</script>

<g 
  bind:this={container}
  class="a9s-annotation a9s-rubberband">
  
  {#if origin}
    <ellipse 
      class="a9s-outer"
      cx={x + w / 2} 
      cy={y + h / 2} 
      rx={w / 2} 
      ry={h / 2} />

    <ellipse 
      class="a9s-inner"
      cx={x + w / 2} 
      cy={y + h / 2} 
      rx={w / 2} 
      ry={h / 2} />
  {/if}
</g>