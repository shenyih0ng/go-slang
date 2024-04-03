import { WORD_SIZE } from './heap/config'

export class Channel {
  private mem: DataView

  constructor(mem: DataView) { this.mem = mem } // prettier-ignore

  public send(value: any): boolean {
    if (this.isBufferFull()) { return false } // prettier-ignore

    // write value to free slot and increment free slot offset
    this.mem.setFloat64(this.getSlotAddr(this.freeSlotIdx++), value)
    return true
  }

  public recv(): number | null {
    if (this.isBufferEmpty()) { return null } // prettier-ignore

    // get value from first slot
    const value = this.getSlotValue(0)
    // shift all values to the left
    for (let i = 1; i < this.bufferSize; i++) {
      this.mem.setFloat64(this.getSlotAddr(i - 1), this.getSlotValue(i))
    }
    // decrement free slot offset
    this.freeSlotIdx--
    return value
  }

  private get freeSlotIdx(): number {
    return this.mem.getUint16(3)
  }

  private set freeSlotIdx(offset: number) {
    this.mem.setUint16(3, offset)
  }

  private get maxBufferSize(): number {
    return this.mem.getUint16(5)
  }

  private get bufferSize(): number {
    return this.freeSlotIdx
  }

  private isBufferFull(): boolean {
    return this.bufferSize === this.maxBufferSize
  }

  private isBufferEmpty(): boolean {
    return this.bufferSize === 0
  }

  private getSlotAddr(slotIdx: number): number {
    return WORD_SIZE + slotIdx * WORD_SIZE
  }

  private getSlotValue(slotIdx: number): number {
    return this.mem.getFloat64(WORD_SIZE + slotIdx * WORD_SIZE)
  }
}
