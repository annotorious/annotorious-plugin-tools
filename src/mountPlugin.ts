import type { SvelteComponent } from 'svelte';
import { ShapeType, type ImageAnnotator } from '@annotorious/annotorious';
import type { OpenSeadragonAnnotator } from '@annotorious/openseadragon';
import { EllipseEditor, RubberbandEllipse } from './ellipse';
import { LineEditor, RubberbandLine } from './line';

export const mountPlugin = (
  anno: ImageAnnotator | OpenSeadragonAnnotator
) => {
  anno.registerDrawingTool('ellipse', RubberbandEllipse as typeof SvelteComponent);
  anno.registerShapeEditor(ShapeType.ELLIPSE, EllipseEditor as typeof SvelteComponent);

  anno.registerDrawingTool('line', RubberbandLine as typeof SvelteComponent);
  anno.registerShapeEditor(ShapeType.LINE, LineEditor as typeof SvelteComponent);
}