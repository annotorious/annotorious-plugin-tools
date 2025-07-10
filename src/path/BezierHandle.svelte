<script lang="ts">
  export let corner: [number, number];
  export let controlPoint: [number, number];
  export let viewportScale: number = 1;

  $: handleRadius = 4 / viewportScale;
</script>

<g class="a9s-bezier-handle">
  <line
    class="a9s-tangent-line a9s-outer"
    x1={corner[0]}
    y1={corner[1]}
    x2={controlPoint[0]}
    y2={controlPoint[1]} />

  <line
    class="a9s-tangent-line a9s-inner"
    x1={corner[0]}
    y1={corner[1]}
    x2={controlPoint[0]}
    y2={controlPoint[1]} />

  <circle 
    class="a9s-tangent-handle" 
    cx={controlPoint[0]}
    cy={controlPoint[1]}
    r={handleRadius} 
    on:pointerdown />
</g>

<style>
  .a9s-bezier-handle .a9s-tangent-line.a9s-outer {
    stroke: rgba(0, 0, 0, 0.8);
    stroke-width: 2.5px;
    vector-effect: non-scaling-stroke;
  }

  .a9s-bezier-handle .a9s-tangent-line.a9s-inner {
    stroke: #fff;
    stroke-dasharray: 4 1;
    stroke-width: 1.5px;
    vector-effect: non-scaling-stroke;
  }

  circle.a9s-tangent-handle {
    fill: #000;
    cursor: crosshair;
    stroke: #fff;
    stroke-width: 1px;
    vector-effect: non-scaling-stroke;
  }
</style>