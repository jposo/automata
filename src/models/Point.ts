export default class Point {
  x: number;
  y: number;
  constructor(x?: number, y?: number) {
    this.x = x || 0;
    this.y = y || 0;
  }

  public distanceTo(other: Point): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public add(other: Point): Point {
    return new Point(this.x + other.x, this.y + other.y);
  }

  public subtract(other: Point): Point {
    return new Point(this.x - other.x, this.y - other.y);
  }

  public multiply(scalar: number): Point {
    return new Point(this.x * scalar, this.y * scalar);
  }

  public divide(scalar: number): Point {
    return new Point(this.x / scalar, this.y / scalar);
  }
}
