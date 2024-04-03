import { WORD_SIZE } from './heap/config'

export class Channel {
  private mem: DataView

  constructor(mem: DataView) { this.mem = mem } // prettier-ignore

  public send(value: any): boolean {
    if (this.isBufferFull()) { return false } // prettier-ignore

    // write value to free slot
    this.mem.setFloat64(this.getSlotAddr(this.getFreeSlotIdx()), value)
    // increment free slot offset
    this.setFreeSlotIdx(this.getFreeSlotIdx() + 1)

    return true
  }

  public recv(): number | null {
    if (this.isBufferEmpty()) { return null } // prettier-ignore

    // get value from first slot
    const value = this.getSlotValue(0)
    // shift all values to the left
    for (let i = 1; i < this.getBufferSize(); i++) {
      this.mem.setFloat64(this.getSlotAddr(i - 1), this.getSlotValue(i))
    }
    // decrement free slot offset
    this.setFreeSlotIdx(this.getFreeSlotIdx() - 1)

    return value
  }

  public getFreeSlotIdx(): number {
    return this.mem.getUint16(3)
  }

  private setFreeSlotIdx(offset: number): void {
    this.mem.setUint16(3, offset)
  }

  public getMaxBufferSize(): number {
    return this.mem.getUint16(5)
  }

  public getBufferSize(): number {
    return this.getFreeSlotIdx()
  }

  public isBufferFull(): boolean {
    return this.getBufferSize() === this.getMaxBufferSize()
  }

  public isBufferEmpty(): boolean {
    return this.getBufferSize() === 0
  }

  private getSlotAddr(slotIdx: number): number {
    return WORD_SIZE + slotIdx * WORD_SIZE
  }

  private getSlotValue(slotIdx: number): number {
    return this.mem.getFloat64(WORD_SIZE + slotIdx * WORD_SIZE)
  }
}
