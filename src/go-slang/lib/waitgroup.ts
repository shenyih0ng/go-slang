import { HeapObject } from './heap/types'

export class WaitGroup extends HeapObject {
  protected COUNT_OFFSET = 1

  toString(): string {
    return `WaitGroup { count: ${this.getCount()} }`
  }

  constructor(memory: DataView) {
    super(memory)
  }

  protected getCount(): number {
    return this.memory.getFloat32(this.COUNT_OFFSET)
  }

  protected setCount(value: number): number {
    this.memory.setFloat32(this.COUNT_OFFSET, value)
    return value
  }

  public add(n: number): void {
    this.setCount(this.getCount() + n)
  }

  public done(): number {
    return this.setCount(this.getCount() - 1)
  }

  public wait(): boolean {
    return this.getCount() > 0
  }
}
