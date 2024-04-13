import { WORD_SIZE } from "./heap/config"

export class WaitGroup {
  protected memory: DataView

  toString(): string { return `WaitGroup { count: ${this.getCount()} }` }

  constructor(memory: DataView) { this.memory = memory }

  protected getCountAddr(): number { return WORD_SIZE }

  protected getCount(): number { return this.memory.getFloat64(this.getCountAddr()) }

  protected setCount(value: number): void { this.memory.setFloat64(this.getCountAddr(), value) }

  public add(n: number): void { this.setCount(this.getCount() + n) }

  public done(): void { this.setCount(this.getCount() - 1) }

  public wait(): boolean { return this.getCount() > 0 }
}