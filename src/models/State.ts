import Point from "./Point";
import { nanoid } from "nanoid";

export default class State {
  id: string;
  name: string;
  center: Point;
  isFinal: boolean;
  radius: number;

  constructor(
    name?: string,
    center?: Point,
    isFinal?: boolean,
    radius?: number
  ) {
    this.id = nanoid();
    this.name = name || "qx";
    this.center = center || new Point(0, 0);
    this.isFinal = isFinal || false;
    this.radius = radius || 30;
  }

  // get x(): number {
  //   return this.center.x;
  // }

  // get y(): number {
  //   return this.center.y;
  // }

  // toString(): string {
  //   return `State(name="${this.name}")`;
  // }
}
