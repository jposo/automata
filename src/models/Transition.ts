import State from "./State";
import Symbol from "./Symbol";

export default class Transition {
  from: State;
  to: State;
  symbol: Symbol;
  constructor(from?: State, to?: State, symbol?: Symbol) {
    this.from = from || new State();
    this.to = to || new State();
    this.symbol = symbol || new Symbol();
  }

  public addSymbol(symbol: string): void {
    this.symbol.values.push(symbol);
  }

  public removeSymbol(symbol: string): void {
    this.symbol.values = this.symbol.values.filter((value) => value !== symbol);
  }

  public removeSymbolViaIndex(index: number): void {
    this.symbol.values.splice(index, 1);
  }
}
