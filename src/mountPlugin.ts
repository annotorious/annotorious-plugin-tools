import { ShapeType, type ImageAnnotator } from '@annotorious/annotorious';
import { EllipseEditor, RubberbandEllipse } from './ellipse';
import type { SvelteComponent } from 'svelte';

export const mountPlugin = (
  anno: ImageAnnotator
) => {
  anno.registerDrawingTool('ellipse', RubberbandEllipse as typeof SvelteComponent);
  anno.registerShapeEditor(ShapeType.ELLIPSE, EllipseEditor as typeof SvelteComponent);
}