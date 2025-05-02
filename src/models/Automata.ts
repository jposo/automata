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
    this.initial = this.states.find((state) => state.id === json.initial?.id)!;
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
        (state) => state.id === data.initial?.id
      )!;
      this.stateCount = data.states.length;
      this.transitionCount = data.transitions.length;
    }
  }

  private createStates(obj: any): State[] {
    const states: State[] = [];
    for (const state of obj) {
      const newState = new State(
        state.name,
        state.center,
        state.isFinal,
        state.radius
      );
      newState.setId(state.id);
      states.push(newState);
    }
    return states;
  }

  private createTransitions(obj: any): Transition[] {
    const transitions: Transition[] = [];
    for (const transition of obj) {
      const fromState = this.states.find(
        (state) => state.id === transition.from.id
      );
      const toState = this.states.find(
        (state) => state.id === transition.to.id
      );
      const newTransition = new Transition(
        fromState,
        toState,
        new Symbol(transition.symbol.values, transition.symbol.position)
      );
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

  private stateSetToString(stateSet: Set<State>): string {
    return Array.from(stateSet)
      .map((state) => state.id)
      .sort()
      .join(",");
  }

  public convertToDFA() {
    const dfaStates = new Map<string, State>();
    const dfaTransitions = new Set<Transition>();

    const alphabet = this.alphabet();
    const initialStateSet = this.epsilonClosure(this.initial);

    // Marks this automatas states
    const processedStateSets = new Map<string, State>();
    // Create initial DFA state
    const initialStateSetString = this.stateSetToString(initialStateSet);
    const initialDFAState = new State(
      "q0",
      initialStateSet.values().next().value.center,
      Array.from(initialStateSet).some((state: State) => state.isFinal)
    );
    dfaStates.set(initialStateSetString, initialDFAState);
    processedStateSets.set(initialStateSetString, initialDFAState);

    // Queue of state sets to process
    const queue: Array<[string, Set<State>]> = [
      [initialStateSetString, initialStateSet],
    ];
    let nextStateId = 1;

    while (queue.length > 0) {
      const [currentStateSetString, currentStateSet] = queue.shift()!;
      const currentDFAState = processedStateSets.get(currentStateSetString)!;

      for (const symbol of alphabet) {
        // Find all reachable states by taking symbol transition from any state in the set
        const nextStateSet = new Set<State>();

        for (const state of currentStateSet) {
          const transitions = this.transitions.filter(
            (t) => t.from.id === state.id && t.symbol.values.includes(symbol)
          );

          for (const transition of transitions) {
            // Add all states in the epsilon epsilonClosure
            const reachableStates = this.epsilonClosure(transition.to);
            for (const reachableState of reachableStates) {
              nextStateSet.add(reachableState);
            }
          }
        }

        if (nextStateSet.size === 0) continue;

        const nextStateSetString = this.stateSetToString(nextStateSet);
        let nextDFAState: State;

        if (!processedStateSets.has(nextStateSetString)) {
          // If the state does not exist in the DFA, create a new state and add it
          nextDFAState = new State(
            `q${nextStateId++}`,
            nextStateSet.values().next().value.center,
            Array.from(nextStateSet).some((state: State) => state.isFinal)
          );

          dfaStates.set(nextStateSetString, nextDFAState);
          processedStateSets.set(nextStateSetString, nextDFAState);

          // Add to queue for processing
          queue.push([nextStateSetString, nextStateSet]);
        } else {
          nextDFAState = processedStateSets.get(nextStateSetString)!;
        }

        // Create transition
        const newTransition = new Transition(
          currentDFAState,
          nextDFAState,
          new Symbol([symbol])
        );
        dfaTransitions.add(newTransition);
      }
    }
    const dfa = new Automata(
      `${this.name} as DFA`,
      Array.from(dfaStates.values()),
      Array.from(dfaTransitions),
      initialDFAState
    );
    console.log(dfa);
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
