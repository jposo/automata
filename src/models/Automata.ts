import State from "./State";
import Transition from "./Transition";

export default class Automata {
  constructor(
    public name: string,
    public states: State[],
    public transitions: Transition[],
    public initial: State | null = null
  ) {}
}
