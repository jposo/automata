import Point from "./Point";

export default class Symbol {
  values: string[];
  position: Point;
  constructor(values?: string[], position?: Point) {
    this.values = values || [];
    this.position = position || new Point(0, 0);
  }
}
