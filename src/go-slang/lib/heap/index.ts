import { DEFAULT_HEAP_SIZE, SIZE_OFFSET, WORD_SIZE } from './config'
import { PointerTag } from './tags'

export type HeapAddress = number

export class Heap {
  private memory: DataView
  private free: number = 0 // n_words to the next free block

  constructor(n_words?: number) {
    this.memory = new DataView(new ArrayBuffer((n_words ?? DEFAULT_HEAP_SIZE) * WORD_SIZE))
  }

  /**
   * Allocate a value in the heap
   *
   * The possible values are:
   * 1. JavaScript primitive values (number, boolean)
   * 2. AST nodes
   * 3. ECE operations (e.g. ClosureOp, BuiltinOp)
   *
   * @param value the value to be allocated
   */
  public alloc(value: any) {
    const valueType = typeof value
    if (valueType === 'boolean') {
      return this.allocateBoolean(value)
    } else if (valueType === 'number') {
      return this.allocateNumber(value)
    }

    // TEMP: if the value is not a supported type, return the value as is
    return value
  }

  /**
   * Resolve a heap address to its underlying data/value
   *
   * @param heap_addr heap address of the value to be resolved
   * @returns the resolved value
   */
  public resolve(heap_addr: any): any {
    if (typeof heap_addr !== 'number') {
      // TEMP: if the value is not a heap address, return the value as is
      return heap_addr
    }

    const tag = this.memory.getInt8(heap_addr * WORD_SIZE)
    switch (tag) {
      case PointerTag.False:
        return false
      case PointerTag.True:
        return true
      case PointerTag.Number:
        return this.get(heap_addr + 1)
    }
  }

  private allocateBoolean(value: boolean): HeapAddress {
    // booleans are represented as tagged pointers with no underlying data
    return this.allocateTaggedPtr(value ? PointerTag.True : PointerTag.False, 0)
  }

  private allocateNumber(value: number): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.Number, 1)
    // address of the data block storing the number
    // location: the block right after the pointer block
    const data_heap_addr = ptr_heap_addr + 1
    this.set(data_heap_addr, value)
    return ptr_heap_addr
  }

  /**
   * Allocate a tagged pointer in the heap
   *
   * @param tag  The tag to be associated with the pointer
   * @param size The size of the underlying data structure
   * @returns Address of the allocated block
   */
  private allocateTaggedPtr(tag: PointerTag, size: number): HeapAddress {
    const alloc_heap_addr = this.free
    // move the free pointer to the next block
    // next free location: current free + size of the data + 1 (the pointer tag)
    this.free += size + 1

    const alloc_mem_addr = alloc_heap_addr * WORD_SIZE
    // mark the block with the given tag
    // location: byte [0] of the block
    this.memory.setInt8(alloc_mem_addr, tag)
    // set the size (2 bytes) of the underlying data structure
    // location: byte [SIZE_OFFSET:SIZE_OFFSET+2] of the block
    this.memory.setUint16(alloc_mem_addr + SIZE_OFFSET, size)

    return alloc_heap_addr
  }

  /**
   * Get the raw word value at the given address
   *
   * @param address n_words to the query block
   * @returns raw word value at the given address
   */
  private get(address: HeapAddress): number {
    return this.memory.getFloat64(address * WORD_SIZE)
  }

  /**
   * Set word value at the given address
   *
   * @param address n_words to the block
   * @param value   value to be set
   */
  private set(address: number, value: number): void {
    this.memory.setFloat64(address * WORD_SIZE, value)
  }
}
