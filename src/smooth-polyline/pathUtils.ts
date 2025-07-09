import type { Polyline, PolylinePoint } from '@annotorious/annotorious';

export const calculateTangentDirection = (
  shape: Polyline,
  index: number, 
  maxWidth: number = 60
): [number, number] => {
  const { points, closed } = shape.geometry;

  const currentPoint = points[index];

  const prevIdx = index === 0 ? (closed ? points.length - 1 : null) : index - 1;
  const nextIdx = index === points.length - 1 ? (closed ? 0 : null) : index + 1;

  let tangentX = 0;
  let tangentY = 0;

  if (prevIdx !== null && nextIdx !== null) {
    // Middle point - use direction from previous to next point
    const prevPoint = points[prevIdx].point;
    const nextPoint = points[nextIdx].point;
    tangentX = nextPoint[0] - prevPoint[0];
    tangentY = nextPoint[1] - prevPoint[1];
  } else if (prevIdx !== null) {
    // End point - use direction from previous point
    const prevPoint = points[prevIdx].point;
    tangentX = currentPoint.point[0] - prevPoint[0];
    tangentY = currentPoint.point[1] - prevPoint[1];
  } else if (nextIdx !== null) {
    // Start point - use direction to next point
    const nextPoint = points[nextIdx].point;
    tangentX = nextPoint[0] - currentPoint.point[0];
    tangentY = nextPoint[1] - currentPoint.point[1];
  }

  const length = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
  if (length > 0) {
    const factor = Math.min(length * 0.3, maxWidth); // Control handle distance
    tangentX = (tangentX / length) * factor;
    tangentY = (tangentY / length) * factor;
  }

  return [tangentX, tangentY];
}

export const togglePolylineCorner = (shape: Polyline, cornerIdx: number): Polyline => {
  const corner = shape.geometry.points[cornerIdx];
  
  if (corner.type === 'CORNER') {
    // Convert to curve - create symmetric control points for smooth curve
    const [tangentX, tangentY] = calculateTangentDirection(shape, cornerIdx);
    
    const currPoint = corner.point;

    const inHandle: [number, number] = [
      currPoint[0] - tangentX,
      currPoint[1] - tangentY
    ];

    const outHandle: [number, number] = [
      currPoint[0] + tangentX,
      currPoint[1] + tangentY
    ];

    return {
      ...shape,
      geometry: {
        ...shape.geometry,
        points: shape.geometry.points.map((pt, i) => i === cornerIdx ? {
          ...pt,
          type: 'CURVE',
          inHandle,
          outHandle
        } as PolylinePoint : pt)
      }
    };
  } else {
    return {
      ...shape,
      geometry: {
        ...shape.geometry,
        points: shape.geometry.points.map((pt, i) => i === cornerIdx ? {
          ...pt,
          type: 'CORNER'
        } as PolylinePoint : pt)
      }
    }
  }
}