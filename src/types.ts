export interface Point {
  x: number;
  y: number;
}

export interface State {
  center: Point;
  radius: number;
  color: string;
  name: string;
  isFinal: boolean;
}

export interface Transition {
  from: number;
  to: number;
  symbol: string;
}

export enum Mode {
  Create = 'create',
  Move = 'move'
}