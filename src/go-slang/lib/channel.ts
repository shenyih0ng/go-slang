import { WORD_SIZE } from './heap/config'
import { HeapObject } from './heap/types'

/* prettier-ignore */
export class Channel extends HeapObject{
  constructor(memory: DataView) { super(memory) }

  protected get maxBufSize(): number { return this.memory.getUint16(5) }

  protected getSlotAddr(slotIdx: number): number { return (slotIdx + 1) * WORD_SIZE }

  protected getSlotValue(slotIdx: number): number { return this.memory.getFloat64(this.getSlotAddr(slotIdx)) }

  protected setSlotValue(slotIdx: number, value: number): void { this.memory.setFloat64(this.getSlotAddr(slotIdx), value) }
}

export class UnbufferedChannel extends Channel {
  static RECV_ID_OFFSET = 1
  static SEND_ID_OFFSET = 3
  static SYNCED_OFFSET = 7

  static NULL_ID = -1

  constructor(memory: DataView) { super(memory) } // prettier-ignore

  public send(routineId: number, value: any): boolean {
    const isSender = this.sendId === routineId
    if (isSender) {
      if (this.synced) {
        // there is a receiver that has already taken the value
        // that the current routine was trying to send previously
        // therefore, the current routine can continue

        // reset the channel state
        this.reset()
        return true
      } else {
        // the value hasn't been taken by a receiver
        // so the routine needs to continue waiting
        return false
      }
    }

    if (this.hasSender() || this.synced) {
      // if there is another sender or another sync is happening, the current routine
      // cannot send the value and needs to wait
      return false
    }

    // there is no sender and no sync happening
    // the current routine can try to send the value

    this.setSlotValue(0, value) // set the value to be sent
    this.sendId = routineId // claim the channel as the sender

    if (this.hasReceiver()) {
      // if there is a receiver waiting, the current routine can proceed to start
      // the sync process
      this.synced = true
      return true
    } else {
      // no receiver waiting, the current routine needs to wait
      // we hand the responsibility of syncing to the receiver
      return false
    }
  }

  public recv(routineId: number): number | null {
    const isReciever = this.recvId === routineId
    if (isReciever) {
      if (this.synced) {
        // there is a value to be recieved by the current routine
        // that was trying to recieve previously
        // therefore, the current routine can continue

        // extract the value from the channel and reset the channel state
        const value = this.getSlotValue(0)
        this.reset()
        return value
      } else {
        // there is no value to be recieved so the routine needs to continue waiting
        return null
      }
    }

    if (this.hasReceiver() || this.synced) {
      // if there is another reciever or another sync is happening, the current routine
      // cannot try to recieve a value and needs to wait
      return null
    }

    // there is no reciever and no sync happening
    // the current routine can try to recieve a value

    if (this.hasSender()) {
      // if there is a sender waiting, the current routine can proceed to start
      // the recieve the value and start the sync process
      this.synced = true
      return this.getSlotValue(0)
    } else {
      // no sender waiting, the current routine needs to wait
      // we hand the responsibility of syncing to the sender
      return null
    }
  }

  public toString(): string {
    return `UnbufferedChan(addr=0x${this.addr.toString(16)})`
  }

  private hasSender(): boolean { return this.sendId !== UnbufferedChannel.NULL_ID } // prettier-ignore

  private hasReceiver(): boolean { return this.recvId !== UnbufferedChannel.NULL_ID } // prettier-ignore

  private get recvId(): number {
    return this.memory.getInt16(UnbufferedChannel.RECV_ID_OFFSET)
  }

  private set recvId(newRecvId: number) {
    this.memory.setInt16(UnbufferedChannel.RECV_ID_OFFSET, newRecvId)
  }

  private get sendId(): number {
    return this.memory.getInt16(UnbufferedChannel.SEND_ID_OFFSET)
  }

  private set sendId(newSendId: number) {
    this.memory.setInt16(UnbufferedChannel.SEND_ID_OFFSET, newSendId)
  }

  private get synced(): boolean {
    return this.memory.getUint8(UnbufferedChannel.SYNCED_OFFSET) === 1
  }

  private set synced(hasSynced: boolean) {
    this.memory.setUint8(UnbufferedChannel.SYNCED_OFFSET, hasSynced ? 1 : 0)
  }

  private reset(): void {
    this.sendId = UnbufferedChannel.NULL_ID
    this.recvId = UnbufferedChannel.NULL_ID
    this.synced = false
  }
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

  public toString(): string {
    return `BufferedChan(addr=0x${this.addr.toString(16)})`
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
