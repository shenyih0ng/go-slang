import { HeapObject } from './heap/types'

export class Mutex extends HeapObject {
  protected LOCKED_OFFSET = 7

  toString(): string {
    return `Mutex { isLocked: ${this.getisLocked()} }`
  }

  constructor(memory: DataView) {
    super(memory)
  }

  protected getisLocked(): boolean {
    return this.memory.getUint8(this.LOCKED_OFFSET) === 1
  }

  protected setisLocked(value: boolean): void {
    this.memory.setUint8(this.LOCKED_OFFSET, value ? 1 : 0)
  }

  public isLocked(): boolean {
    return this.getisLocked()
  }

  public lock(): void {
    this.setisLocked(true)
  }

  public unlock(): void {
    this.setisLocked(false)
  }
}
