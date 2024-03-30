import { BuiltinOp, ClosureOp, CommandType, isCommand } from '../../types'
import { DEFAULT_HEAP_SIZE, WORD_SIZE } from './config'
import { PointerTag } from './tags'

export type HeapAddress = number

export class Heap {
  private memory: DataView
  private free: number = 0 // n_words to the next free block

  constructor(n_words?: number) {
    this.memory = new DataView(new ArrayBuffer((n_words ?? DEFAULT_HEAP_SIZE) * WORD_SIZE))

    // Allocate special values in the heap to avoid re-allocating them
    // NOTE: these values are allocated at the beginning of the heap
    this.allocateBoolean(false) // heap_addr: 0
    this.allocateBoolean(true) // heap_addr: 1
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
    // JavaScript primitive values
    const valueType = typeof value
    if (valueType === 'boolean') {
      return +value
    } else if (valueType === 'number') {
      return this.allocateNumber(value)
    }

    // ECE operations
    if (isCommand(value)) {
      switch (value.type) {
        case CommandType.BuiltinOp:
          return this.allocateBuiltinOp(value)
        case CommandType.ClosureOp:
          return this.allocateClosureOp(value)
      }
    }

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

    const mem_addr = heap_addr * WORD_SIZE
    switch (this.tag(heap_addr)) {
      case PointerTag.False:
        return false
      case PointerTag.True:
        return true
      case PointerTag.Number:
        return this.get(heap_addr + 1)
      case PointerTag.BuiltInOp:
        return {
          type: CommandType.BuiltinOp,
          arity: this.memory.getInt16(mem_addr + 1),
          id: this.memory.getInt16(mem_addr + 3)
        } as BuiltinOp
      case PointerTag.ClosureOp:
        return {
          type: CommandType.ClosureOp,
          funcDeclNodeUid: this.memory.getInt16(mem_addr + 1),
          envId: this.memory.getInt16(mem_addr + 3)
        } as ClosureOp
    }
  }

  private allocateBoolean(value: boolean): HeapAddress {
    // booleans are represented as tagged pointers with no underlying data
    return this.allocateTaggedPtr(value ? PointerTag.True : PointerTag.False, 0)
  }

  /* Memory Layout of a Number: [0-7:ptr][0-7:data] (2 words) */
  private allocateNumber(value: number): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.Number, 1)

    const data_heap_addr = ptr_heap_addr + 1
    this.set(data_heap_addr, value)

    return ptr_heap_addr
  }

  /* Memory Layout of a BuiltinOp: [0:tag, 1-2: arity, 3-4:id, 5-6:size, 7:_unused_] (1 word) */
  private allocateBuiltinOp({ arity, id }: BuiltinOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.BuiltInOp)

    const ptr_mem_addr = ptr_heap_addr * WORD_SIZE
    // NOTE: assume there will be no arity greater than 2^16
    this.memory.setInt16(ptr_mem_addr + 1, arity ?? -1)
    // NOTE: assume there are no more than 2^16 built-in operations
    this.memory.setInt16(ptr_mem_addr + 3, id)

    return ptr_heap_addr
  }

  /* Memory Layout of a ClosureOp: [0:tag, 1-2:funcDeclNodeUid, 3-4:envId, 5-6:size, 7:_unused_] (1 word) */
  private allocateClosureOp({ funcDeclNodeUid, envId }: ClosureOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.ClosureOp)

    const ptr_mem_addr = ptr_heap_addr * WORD_SIZE
    // NOTE: assume there will be no more than 2^16 AST nodes
    this.memory.setInt16(ptr_mem_addr + 1, funcDeclNodeUid)
    // NOTE: assume there will be no more than 2^16 envs
    this.memory.setInt16(ptr_mem_addr + 3, envId)

    return ptr_heap_addr
  }

  /**
   * Allocate a tagged pointer in the heap
   *
   * Memory Layout of a tagged pointer (1 word):
   * [0:tag, 1-4:_unused_, 5-6:size, 7:_unused_]
   *
   * @param tag  The tag to be associated with the pointer
   * @param size The size of the underlying data structure
   * @returns Address of the allocated block
   */
  private allocateTaggedPtr(tag: PointerTag, size: number = 0): HeapAddress {
    const SIZE_OFFSET = 5 // in bytes

    const alloc_heap_addr = this.free
    // move the free pointer to the next block
    // next free location: current free + size of the data + 1 (the pointer tag)
    this.free += size + 1

    const alloc_mem_addr = alloc_heap_addr * WORD_SIZE
    // set the tag (1 byte) of the block
    this.memory.setInt8(alloc_mem_addr, tag)
    // set the size (2 bytes) of the underlying data structure
    this.memory.setUint16(alloc_mem_addr + SIZE_OFFSET, size)

    return alloc_heap_addr
  }

  /**
   * Get the tag of the block at the given address
   *
   * @param heap_addr n_words to the block
   * @returns tag of the block
   */
  private tag(heap_addr: HeapAddress): PointerTag {
    return this.memory.getInt8(heap_addr * WORD_SIZE)
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
