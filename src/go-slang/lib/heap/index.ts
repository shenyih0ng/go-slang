import {
  AssignOp,
  BinaryOp,
  BuiltinOp,
  CallOp,
  ClosureOp,
  CommandType,
  EnvOp,
  GoRoutineOp,
  MakeChannel,
  Node,
  PopS,
  Type,
  UnaryOp,
  VarDeclOp,
  isCommand,
  isMake,
  isNode
} from '../../types'
import { AstMap } from '../astMap'
import { BufferedChannel } from '../channel'
import { DEFAULT_HEAP_SIZE, WORD_SIZE } from './config'
import { PointerTag } from './tags'

export type HeapAddress = number

export class Heap {
  private memory: DataView
  private free: number = 0 // n_words to the next free block

  // we need to keep track of the AstMap to be able to resolve AST nodes stored in the heap
  private astMap: AstMap

  constructor(astMap: AstMap, n_words?: number) {
    this.astMap = astMap
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

    // AST nodes
    if (isNode(value)) {
      // we need to track the AST node to be able to resolve it later
      return this.allocateAstNode(this.astMap.track(value))
    }

    // ECE operations
    if (isCommand(value)) {
      switch (value.type) {
        case CommandType.VarDeclOp:
          return this.allocateVarDeclOp(value)
        case CommandType.AssignOp:
          return this.allocateAssignOp(value)
        case CommandType.UnaryOp:
        case CommandType.BinaryOp:
          return this.allocateUnaryBinaryOp(value)
        case CommandType.CallOp:
        case CommandType.GoRoutineOp:
          return this.allocateCallOp(value)
        case CommandType.BuiltinOp:
          return this.allocateBuiltinOp(value)
        case CommandType.ClosureOp:
          return this.allocateClosureOp(value)
        case CommandType.EnvOp:
          return this.allocateEnvOp(value)
        case CommandType.PopSOp:
          return this.allocateTaggedPtr(PointerTag.PopSOp)
      }
    }

    // Make operation
    if (isMake(value)) {
      switch (value.type) {
        case Type.Channel:
          const { size: bufSize } = value as MakeChannel
          return bufSize === 0 ? this.allocateUnbufferedChan() : this.allocateBufferedChan(bufSize)
      }
    }

    return value
  }

  public allocM(values: any[]): HeapAddress[] {
    return values.map(this.alloc.bind(this))
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

    const tag = this.tag(heap_addr)
    const mem_addr = heap_addr * WORD_SIZE
    switch (tag) {
      case PointerTag.False:
        return false
      case PointerTag.True:
        return true
      case PointerTag.Number:
        return this.get(heap_addr + 1)
      case PointerTag.AstNode:
        return this.astMap.get(this.memory.getInt16(mem_addr + 1))
      case PointerTag.VarDeclOp:
        return {
          type: CommandType.VarDeclOp,
          idNodeUid: this.memory.getInt16(mem_addr + 1),
          zeroValue: this.memory.getInt8(mem_addr + 7) === 1
        } as VarDeclOp
      case PointerTag.AssignOp:
        return {
          type: CommandType.AssignOp,
          idNodeUid: this.memory.getInt16(mem_addr + 1)
        } as AssignOp
      case PointerTag.UnaryOp:
      case PointerTag.BinaryOp:
        return {
          type: tag === PointerTag.UnaryOp ? CommandType.UnaryOp : CommandType.BinaryOp,
          opNodeId: this.memory.getInt16(mem_addr + 1)
        } as UnaryOp | BinaryOp
      case PointerTag.CallOp:
      case PointerTag.GoRoutineOp:
        return {
          type: tag === PointerTag.CallOp ? CommandType.CallOp : CommandType.GoRoutineOp,
          calleeNodeId: this.memory.getInt16(mem_addr + 1),
          arity: this.memory.getInt16(mem_addr + 3)
        } as CallOp | GoRoutineOp
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
      case PointerTag.EnvOp:
        return {
          type: CommandType.EnvOp,
          envId: this.memory.getInt16(mem_addr + 1)
        } as EnvOp
      case PointerTag.PopSOp:
        return PopS
      case PointerTag.BufferedChannel:
        const chanMaxBufSize = this.size(heap_addr)
        const chanMemRegion = new DataView(
          this.memory.buffer,
          mem_addr,
          // +1 to include the tagged pointer
          WORD_SIZE * (chanMaxBufSize + 1)
        )
        return new BufferedChannel(chanMemRegion)
    }
  }

  public resolveM(heap_addrs: any[]): any[] {
    return heap_addrs.map(this.resolve.bind(this))
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

  /* Memory Layout of an AST Node: [0:tag, 1-2:astId, 3-4:_unused_, 5-6:size, 7:_unused_] (1 word) */
  private allocateAstNode({ uid }: Node): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.AstNode)

    const ptr_mem_addr = ptr_heap_addr * WORD_SIZE
    this.memory.setInt16(ptr_mem_addr + 1, uid as number)

    return ptr_heap_addr
  }

  /* Memory Layout of a Unary/Binary Op: [0:tag, 1-2:opNodeId, 3-4:_unused_, 5-6:size, 7:_unused_] (1 word) */
  private allocateUnaryBinaryOp({ type, opNodeId }: UnaryOp | BinaryOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(
      type === CommandType.UnaryOp ? PointerTag.UnaryOp : PointerTag.BinaryOp
    )

    const ptr_mem_addr = ptr_heap_addr * WORD_SIZE
    this.memory.setInt16(ptr_mem_addr + 1, opNodeId)

    return ptr_heap_addr
  }

  /* Memory Layout of a VarDeclOp: [0:tag, 1-2:idNodeUid, 3-4:_unused_, 5-6:size, 7:isZeroValue] (1 word) */
  private allocateVarDeclOp({ zeroValue, idNodeUid }: VarDeclOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.VarDeclOp)

    const ptr_mem_addr = ptr_heap_addr * WORD_SIZE
    this.memory.setInt16(ptr_mem_addr + 1, idNodeUid)
    this.memory.setInt8(ptr_mem_addr + 7, zeroValue ? 1 : 0)

    return ptr_heap_addr
  }

  /* Memory Layout of an AssignOp: [0:tag, 1-2:idNodeUid, 3-4:_unused_, 5-6:size, 7:_unused_] (1 word) */
  private allocateAssignOp({ idNodeUid }: AssignOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.AssignOp)

    const ptr_mem_addr = ptr_heap_addr * WORD_SIZE
    this.memory.setInt16(ptr_mem_addr + 1, idNodeUid)

    return ptr_heap_addr
  }

  /* Memory Layout of a CallOp: [0:tag, 1-2:calleeNodeId, 3-4:arity, 5-6:size, 7:_unused_] (1 word) */
  private allocateCallOp({ type, calleeNodeId, arity }: CallOp | GoRoutineOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(
      type === CommandType.CallOp ? PointerTag.CallOp : PointerTag.GoRoutineOp
    )

    const ptr_mem_addr = ptr_heap_addr * WORD_SIZE
    // NOTE: assume there will be no more than 2^16 AST nodes
    this.memory.setInt16(ptr_mem_addr + 1, calleeNodeId)
    // NOTE: assume there will be no more than 2^16 arguments
    this.memory.setInt16(ptr_mem_addr + 3, arity)

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

  /* Memory Layout of an EnvOp: [0:tag, 1-2:envId, 3-4:_unused_, 5-6:size, 7:_unused_] (1 word) */
  private allocateEnvOp({ envId }: EnvOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.EnvOp)

    const ptr_mem_addr = ptr_heap_addr * WORD_SIZE
    // NOTE: assume there will be no more than 2^16 envs
    this.memory.setInt16(ptr_mem_addr + 1, envId)

    return ptr_heap_addr
  }

  public allocateUnbufferedChan(): HeapAddress {
    throw new Error('allocateUnbufferedChan not implemented.')
  }

  /* Memory Layout of an BufferedChannel:
   * [0:tag, 1:readIdx, 2:writeIdx, 3:bufSize, 4:_unused_, 5-6:bufSize, 7:_unused_] (1 + `size` words)
   */
  public allocateBufferedChan(size: number): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.BufferedChannel, size)

    const ptr_mem_addr = ptr_heap_addr * WORD_SIZE
    this.memory.setUint8(ptr_mem_addr + 1, 0) // initialize read index to 0
    this.memory.setUint8(ptr_mem_addr + 2, 0) // initialize write index to 0
    this.memory.setUint8(ptr_mem_addr + 3, 0) // initialize buffer size to 0

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
   * @param heap_addr
   * @returns tag of the block
   */
  private tag(heap_addr: HeapAddress): PointerTag {
    return this.memory.getInt8(heap_addr * WORD_SIZE)
  }

  /**
   * Get the size of the underlying data structure of the tagged pointer
   *
   * @param heap_addr
   * @returns size of the underlying data structure
   */
  private size(heap_addr: HeapAddress): number {
    return this.memory.getUint16(heap_addr * WORD_SIZE + 5)
  }

  /**
   * Get the raw word value at the given address
   *
   * @param heap_addr
   * @returns raw word value at the given address
   */
  private get(heap_addr: HeapAddress): number {
    return this.memory.getFloat64(heap_addr * WORD_SIZE)
  }

  /**
   * Set word value at the given address
   *
   * @param heap_addr
   * @param value value to be set
   */
  private set(heap_addr: number, value: number): void {
    this.memory.setFloat64(heap_addr * WORD_SIZE, value)
  }
}
