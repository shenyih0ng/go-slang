export class HeapObject {
  protected memory: DataView

  constructor(memory: DataView) {
    this.memory = memory
  }

  protected get addr(): number {
    return this.memory.byteOffset
  }

  public isEqual(other: HeapObject): boolean {
    // it is only equal if it is the same object in memory
    return this.addr === other.addr
  }
}
