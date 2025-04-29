import State from "./State";
import Transition from "./Transition";
import Symbol from "./Symbol";
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

  public popState(): State | null {
    if (this.states.length > 0) {
      const state = this.states[this.states.length - 1];
      this.deleteState(state);
      return state;
    }
    return null;
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
    this.states = this.createStates(json.states);
    this.transitions = this.createTransitions(json.transitions);
    this.initial = this.states.find(
      (state) => state.id === json.initial?.id)!;
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
      this.states = this.createStates(data.states);
      this.transitions = this.createTransitions(data.transitions);
      this.initial = this.states.find(
        (state) => state.id === data.initial?.id)!;
      this.stateCount = data.states.length;
      this.transitionCount = data.transitions.length;
    }
  }

  private createStates(obj: any): State[] {
    const states: State[] = [];
    for (const state of obj) {
      const newState = new State(state.name, state.center, state.isFinal, state.radius);
      newState.setId(state.id);
      states.push(newState);
    }
    return states;
  }

  private createTransitions(obj: any): Transition[] {
    const transitions: Transition[] = [];
    for (const transition of obj) {
      const fromState = this.states.find((state) => state.id === transition.from.id);
      const toState = this.states.find((state) => state.id === transition.to.id);
      const newTransition = new Transition(fromState, toState, new Symbol(transition.symbol.values, transition.symbol.position));
      transitions.push(newTransition);
    }
    return transitions;
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

  public alphabet(): string[] {
    const symbols = new Set<string>();
    for (const transition of this.transitions) {
      for (const symbol of transition.symbol.values) {
        if (symbol !== "") {
          symbols.add(symbol);
        }
      }
    }
    return Array.from(symbols);
  }

  public convertToDFA() {
    const dfaStates = new Set<State>();
    const dfaTransitions = new Set<Transition>();

    const initialStates: Set<State> = this.epsilonClosure(this.initial);
    const alphabet = this.alphabet();
    const queue: Set<State>[] = [initialStates];
    const visitedStates = new Map<Set<State>, boolean>();
    let count = 0;
    while (queue.length) {
      const currentStateSet = queue.shift() as Set<State>;
      if (visitedStates.has(currentStateSet)) {
        continue;
      }
      visitedStates.set(currentStateSet, true);
      const currentState = new State(
        `q${count++}`,
        currentStateSet.values().next().value.center,
        Array.from(currentStateSet).some((state) => state.isFinal),
      );
      dfaStates.add(currentState);
      for (const symbol of alphabet) {
        for (const state of currentStateSet) {
          if (
            this.transitions.some(
              (transition) =>
                transition.from.id === state.id &&
                transition.symbol.values.includes(symbol)
            )
          ) {
            const nextStateSet = this.epsilonClosure(
              this.transitions.find(
                (transition) =>
                  transition.from.id === state.id &&
                  transition.symbol.values.includes(symbol)
              )!.to
            );

            queue.push(nextStateSet);
            const nextState = new State(
              `q${count++}`,
              nextStateSet.values().next().value.center,
              Array.from(currentStateSet).some((state) => state.isFinal),
            );
            dfaStates.add(nextState);
            const transition = new Transition(
              currentState,
              nextState,
              new Symbol([symbol])
            );
            dfaTransitions.add(transition);
          }
        }
      }
    }
    const dfa = new Automata(
      `${this.name} as DFA`,
      Array.from(dfaStates),
      Array.from(dfaTransitions),
      dfaStates.values().next().value
    );
    return dfa;
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
