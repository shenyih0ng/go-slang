const word_size = 8
const size_offset = 5

export class Heap {
  private memory: DataView
  private next: number = 0

  constructor(words: number) {
    this.memory = new DataView(new ArrayBuffer(words * word_size))
  }

  public allocate(tag: number, size: number): number {
    const address = this.next
    this.next += size
    this.memory.setInt8(address * word_size, tag)
    this.memory.setUint16(address * word_size + size_offset, size)
    return address
  }

  public get(address: number): number {
    return this.memory.getFloat64(address * word_size)
  }

  public set(address: number, value: number): void {
    this.memory.setFloat64(address * word_size, value)
  }
}
