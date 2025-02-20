import type { Point } from './types';

export function distanceToLineSegment(p: Point, a: Point, b: Point): number {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: p.x - a.x, y: p.y - a.y };
  const abLengthSq = ab.x * ab.x + ab.y * ab.y;
  
  let t = 0;
  if (abLengthSq !== 0) {
    t = (ap.x * ab.x + ap.y * ab.y) / abLengthSq;
  }
  
  t = Math.max(0, Math.min(1, t));
  
  const projection = {
    x: a.x + ab.x * t,
    y: a.y + ab.y * t
  };
  
  return Math.sqrt(
    Math.pow(p.x - projection.x, 2) + 
    Math.pow(p.y - projection.y, 2)
  );
}