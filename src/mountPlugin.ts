import { ShapeType, type ImageAnnotator } from '@annotorious/annotorious';
import type { OpenSeadragonAnnotator } from '@annotorious/openseadragon';
import { EllipseEditor, RubberbandEllipse } from './ellipse';
import { LineEditor, RubberbandLine } from './line';

export const mountPlugin = (
  anno: ImageAnnotator | OpenSeadragonAnnotator
) => {
  anno.registerDrawingTool('ellipse', RubberbandEllipse);
  anno.registerShapeEditor(ShapeType.ELLIPSE, EllipseEditor);

  anno.registerDrawingTool('line', RubberbandLine);
  anno.registerShapeEditor(ShapeType.LINE, LineEditor);
}