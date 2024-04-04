import { WORD_SIZE } from './heap/config'

/* prettier-ignore */
class Channel {
  protected memory: DataView

  constructor(memory: DataView) { this.memory = memory }

  protected get maxBufSize(): number { return this.memory.getUint16(5) }

  protected getSlotAddr(slotIdx: number): number { return (slotIdx + 1) * WORD_SIZE }

  protected getSlotValue(slotIdx: number): number { return this.memory.getFloat64(this.getSlotAddr(slotIdx)) }

  protected setSlotValue(slotIdx: number, value: number): void { this.memory.setFloat64(this.getSlotAddr(slotIdx), value) }
}

export class BufferedChannel extends Channel {
  static READ_IDX_OFFSET = 1
  static WRITE_IDX_OFFSET = 2
  static BUF_SIZE_OFFSET = 3

  constructor(memory: DataView) { super(memory) } // prettier-ignore

  public send(value: any): boolean {
    if (this.isBufferFull()) { return false } // prettier-ignore

    // enqueue
    this.setSlotValue(this.writeIdx++ % this.maxBufSize, value)
    this.bufSize++

    return true
  }

  public recv(): number | null {
    if (this.isBufferEmpty()) { return null } // prettier-ignore

    // dequeue
    const value = this.getSlotValue(this.readIdx++ % this.maxBufSize)
    this.bufSize--

    return value
  }

  public isBufferFull(): boolean {
    return this.bufSize === this.maxBufSize
  }

  public isBufferEmpty(): boolean {
    return this.bufSize === 0
  }

  private get readIdx(): number {
    return this.memory.getUint8(BufferedChannel.READ_IDX_OFFSET)
  }

  private set readIdx(newReadIdx: number) {
    this.memory.setUint8(BufferedChannel.READ_IDX_OFFSET, newReadIdx)
  }

  private get writeIdx(): number {
    return this.memory.getUint8(BufferedChannel.WRITE_IDX_OFFSET)
  }

  private set writeIdx(newWriteIdx: number) {
    this.memory.setUint8(BufferedChannel.WRITE_IDX_OFFSET, newWriteIdx)
  }

  private get bufSize(): number {
    return this.memory.getUint8(BufferedChannel.BUF_SIZE_OFFSET)
  }

  private set bufSize(newBufSize: number) {
    this.memory.setUint8(BufferedChannel.BUF_SIZE_OFFSET, newBufSize)
  }
}
