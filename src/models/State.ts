export default class State {
  constructor(
    public name: string,
    public isFinal: boolean,
    public center: { x: number; y: number },
    public radius = 5,
    public color = "#121212"
  ) {}

  get x(): number {
    return this.center.x;
  }

  get y(): number {
    return this.center.y;
  }

  toString(): string {
    return `State(name="${this.name}")`;
  }
}
