import State from "./State";
import Transition from "./Transition";
import { epsilon } from "../global";

export default class Automata {
  name: string;
  states: State[];
  transitions: Transition[];
  initial: State | null;
  stateCount: number = 0;
  transitionCount: number = 0;

  constructor(
    name?: string,
    states?: State[],
    transitions?: Transition[],
    initial?: State | null
  ) {
    this.name = name || "Unnamed Automata";
    this.states = states || [];
    this.transitions = transitions || [];
    this.initial = initial || null;
    this.stateCount = 0;
    this.transitionCount = 0;
  }

  public addState(state: State): void {
    this.states.push(state);
    this.stateCount++;
  }

  public deleteState(state: State): void {
    const index = this.states.indexOf(state);
    if (index !== -1) {
      // Remove state from states array
      this.states.splice(index, 1);
      // Delete transitions related to state
      this.transitions = this.transitions.filter(
        (t) => t.from.id !== state.id && t.to.id !== state.id
      );
      this.stateCount--;
    }
  }

  public addTransition(transition: Transition): void {
    this.transitions.push(transition);
    this.transitionCount++;
  }

  public deleteTransition(index: number): void {
    if (index !== -1) {
      this.transitions.splice(index, 1);
      this.transitionCount--;
    }
  }

  public setInitial(state: State | null): void {
    this.initial = state;
  }

  public reset(): void {
    this.states = [];
    this.transitions = [];
    this.initial = null;
    this.stateCount = 0;
    this.transitionCount = 0;
  }

  public toJSONString(): string {
    return JSON.stringify(this.toJSON());
  }

  public toJSON(): object {
    return this;
  }

  public fromJSONString(jsonString: string, index: number): void {
    const data = JSON.parse(jsonString);
    this.fromJSON(data);
    this.save(index);
  }

  private fromJSON(json: Automata): void {
    this.name = json.name;
    this.states = json.states;
    this.transitions = json.transitions;
    this.initial = json.initial;
    this.stateCount = json.states.length;
    this.transitionCount = json.transitions.length;
  }

  public save(index: number): void {
    // get automatas saved
    const automatas = JSON.parse(localStorage.getItem("automatas") || "[]");
    automatas[index] = this;
    localStorage.setItem("automatas", JSON.stringify(automatas));
  }

  public load(index: number): void {
    const automatas = JSON.parse(localStorage.getItem("automatas") || "[]");
    if (!automatas || !automatas[index]) return;
    const data = automatas[index];
    if (data) {
      this.name = data.name;
      this.states = data.states;
      this.transitions = data.transitions;
      this.initial = data.initial;
      this.stateCount = data.states.length;
      this.transitionCount = data.transitions.length;
    }
  }

  private epsilonClosure(state: State | null): Set<State> {
    if (!state) return new Set<State>();

    const closure = new Set<State>();
    closure.add(state);
    const stack = [state];
    while (stack.length > 0) {
      const currentState = stack.pop();
      for (const transition of this.transitions) {
        if (
          transition.from.id === currentState?.id &&
          transition.symbol.values.includes("")
        ) {
          const nextState = transition.to;
          if (!closure.has(nextState)) {
            closure.add(nextState);
            stack.push(nextState);
          }
        }
      }
    }
    return closure;
  }

  public runInput(input: string): boolean {
    // Get current possible states
    const currentStates = this.epsilonClosure(this.initial);
    // Iterate over input symbols
    for (const symbol of input) {
      const nextStates = new Set<State>();
      // Iterate over the current states
      for (const state of currentStates) {
        for (const transition of this.transitions) {
          // Check if the transition matches the current state and symbol
          if (
            transition.from.id === state.id &&
            transition.symbol.values.includes(symbol)
          ) {
            nextStates.add(transition.to);
          }
        }
      }
      currentStates.clear();
      for (const state of nextStates) {
        const epsilonClosure = this.epsilonClosure(state);
        for (const nextState of epsilonClosure) {
          currentStates.add(nextState);
        }
      }
    }
    return Array.from(currentStates).some((state) => state.isFinal);
  }

  public isDFA(): boolean {
    if (
      this.transitions.some((transition) =>
        transition.symbol.values.includes("")
      )
    ) {
      return false;
    }
    const counts = new Map();

    // not correct, need to check out symbol is unique
    for (const transition of this.transitions) {
      const key = `${transition.from.id}-${transition.symbol.values[0]}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return Array.from(counts.values()).every((count) => count === 1);
  }
}
