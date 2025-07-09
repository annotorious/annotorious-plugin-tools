import type { PolylineGeometry, PolylinePoint } from '@annotorious/annotorious';

/*
export const togglePointType = (
  point: PolylinePoint, 
  prevPoint?: PolylinePoint, 
  nextPoint?: PolylinePoint,
): PolylinePoint => {
  const hasHandles = point.outgoingHandle || point.incomingHandle;
  
  if (!hasHandles) {
    // Convert to curve with sensible defaults
    const handleDistance = 30; // Adjust as needed
    
    let incomingHandle: [number, number] | undefined;
    let outgoingHandle: [number, number] | undefined;
    
    if (prevPoint) {
      // Calculate direction from previous point
      const dx = point.point[0] - prevPoint.point[0];
      const dy = point.point[1] - prevPoint.point[1];
      const length = Math.sqrt(dx * dx + dy * dy);
      const normalizedDx = dx / length;
      const normalizedDy = dy / length;
      
      incomingHandle = [
        point.point[0] - normalizedDx * handleDistance,
        point.point[1] - normalizedDy * handleDistance
      ];
    }
    
    if (nextPoint) {
      // Calculate direction to next point
      const dx = nextPoint.point[0] - point.point[0];
      const dy = nextPoint.point[1] - point.point[1];
      const length = Math.sqrt(dx * dx + dy * dy);
      const normalizedDx = dx / length;
      const normalizedDy = dy / length;
      
      outgoingHandle = [
        point.point[0] + normalizedDx * handleDistance,
        point.point[1] + normalizedDy * handleDistance
      ];
    }
    
    return {
      ...point,
      incomingHandle,
      outgoingHandle,
      handleLocked: true
    };
  } else {
    return {
      ...point,
      incomingHandle: undefined,
      outgoingHandle: undefined,
      handleLocked: undefined
    };
  }
};
*/