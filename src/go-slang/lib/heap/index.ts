import { OutOfMemoryError } from '../../error'
import { Scheduler } from '../../scheduler'
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
  MakeType,
  NewType,
  UnaryOp,
  VarDeclOp,
  isCommand,
  isMake,
  isNew,
  isNode
} from '../../types'
import { AstMap } from '../astMap'
import { BufferedChannel, UnbufferedChannel } from '../channel'
import { Mutex } from '../mutex'
import { WaitGroup } from '../waitgroup'
import { DEFAULT_HEAP_SIZE, SIZE_OFFSET, WORD_SIZE } from './config'
import { PointerTag } from './tags'

function alignToWord(bytes: number) {
  return Math.ceil(bytes / WORD_SIZE) * WORD_SIZE
}

function ceilPow2(n: number): number {
  return 2 ** Math.ceil(Math.log2(n))
}

function getBuddyAddr(addr: number, bIdx: number): number {
  return addr ^ (1 << bIdx)
}

export type HeapAddress = number

export class Heap {
  public memory: DataView
  // buddyBlocks[i] stores the set of free blocks of size 2^i
  // free blocks are represented by their starting address
  private buddyBlocks: Array<Set<number>>
  // map of heap addresses to their corresponding block size
  private buddyBlockMap: Map<number, number> = new Map()

  // we need to keep track of the AstMap to be able to resolve AST nodes stored in the heap
  private astMap: AstMap
  // keep a reference to the scheduler to be able to get active routines for garbage collection
  // NOTE: this is hacky and should be refactored
  private scheduler: Scheduler

  constructor(astMap: AstMap, scheduler: Scheduler, heapSize: number = DEFAULT_HEAP_SIZE) {
    this.astMap = astMap
    this.scheduler = scheduler

    console.log(`[Heap]: Initializing heap with size ${heapSize} bytes.`) // DEBUG
    this.memory = new DataView(new ArrayBuffer(heapSize))

    const buddyAllocSize = Math.ceil(Math.log2(heapSize))

    this.buddyBlocks = Array.from({ length: buddyAllocSize + 1 }, () => new Set())
    // initialize the block with the maximum size (= size of the entire heap)
    this.buddyBlocks.at(-1)?.add(0)
  }

  private buddyAlloc(bytes: number): HeapAddress {
    const allocSize = alignToWord(ceilPow2(bytes))
    const bIdx = Math.log2(allocSize)

    if (this.buddyBlocks[bIdx].size === 0 && !this.buddySplit(bIdx + 1)) {
      return -1
    }

    const addr = this.buddyBlocks[bIdx].values().next().value
    this.buddyBlocks[bIdx].delete(addr)
    this.buddyBlockMap.set(addr, bIdx)
    return addr
  }

  private buddySplit(idx: number): boolean {
    if (idx >= this.buddyBlocks.length) {
      return false
    }

    if (this.buddyBlocks[idx].size === 0 && !this.buddySplit(idx + 1)) {
      return false
    }

    const addr = this.buddyBlocks[idx].values().next().value
    this.buddyBlocks[idx].delete(addr)

    this.buddyBlocks[idx - 1].add(addr)
    this.buddyBlocks[idx - 1].add(getBuddyAddr(addr, idx - 1))
    return true
  }

  private buddyFree(addr: HeapAddress): void {
    const bIdx = this.buddyBlockMap.get(addr)
    if (bIdx === undefined) {
      throw new Error('Free is utilized on a non-allocated memory address.')
    }

    this.buddyBlocks[bIdx].add(addr)
    this.buddyBlockMap.delete(addr)
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
      return this.allocateBoolean(value)
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
        case MakeType.Channel:
          const { size: bufSize } = value as MakeChannel
          return bufSize === 0 ? this.allocateUnbufferedChan() : this.allocateBufferedChan(bufSize)
      }
    }

    // New operation
    if (isNew(value)) {
      switch (value.type) {
        case NewType.WaitGroup:
          return this.allocateWaitGroup()
        case NewType.Mutex:
          return this.allocateMutex()
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
    switch (tag) {
      case PointerTag.False:
        return false
      case PointerTag.True:
        return true
      case PointerTag.Number:
        return this.memory.getFloat64(heap_addr + 1 * WORD_SIZE)
      case PointerTag.AstNode:
        return this.astMap.get(this.memory.getInt16(heap_addr + 1))
      case PointerTag.VarDeclOp:
        return {
          type: CommandType.VarDeclOp,
          idNodeUid: this.memory.getInt16(heap_addr + 1),
          zeroValue: this.memory.getInt8(heap_addr + 7) === 1
        } as VarDeclOp
      case PointerTag.AssignOp:
        return {
          type: CommandType.AssignOp,
          idNodeUid: this.memory.getInt16(heap_addr + 1)
        } as AssignOp
      case PointerTag.UnaryOp:
      case PointerTag.BinaryOp:
        return {
          type: tag === PointerTag.UnaryOp ? CommandType.UnaryOp : CommandType.BinaryOp,
          opNodeId: this.memory.getInt16(heap_addr + 1)
        } as UnaryOp | BinaryOp
      case PointerTag.CallOp:
      case PointerTag.GoRoutineOp:
        return {
          type: tag === PointerTag.CallOp ? CommandType.CallOp : CommandType.GoRoutineOp,
          calleeNodeId: this.memory.getInt16(heap_addr + 1),
          arity: this.memory.getInt16(heap_addr + 3)
        } as CallOp | GoRoutineOp
      case PointerTag.BuiltInOp:
        return {
          type: CommandType.BuiltinOp,
          arity: this.memory.getInt16(heap_addr + 1),
          id: this.memory.getInt16(heap_addr + 3)
        } as BuiltinOp
      case PointerTag.ClosureOp:
        return {
          type: CommandType.ClosureOp,
          funcDeclNodeUid: this.memory.getInt16(heap_addr + 1),
          envId: this.memory.getInt16(heap_addr + 3)
        } as ClosureOp
      case PointerTag.EnvOp:
        return {
          type: CommandType.EnvOp,
          envId: this.memory.getInt16(heap_addr + 1)
        } as EnvOp
      case PointerTag.PopSOp:
        return PopS
      case PointerTag.UnbufferedChannel:
        return new UnbufferedChannel(new DataView(this.memory.buffer, heap_addr, WORD_SIZE * 2))
      case PointerTag.BufferedChannel:
        const chanMaxBufSize = this.size(heap_addr)
        const chanMemRegion = new DataView(
          this.memory.buffer,
          heap_addr,
          // +1 to include the tagged pointer
          WORD_SIZE * (chanMaxBufSize + 1)
        )
        return new BufferedChannel(chanMemRegion)
      case PointerTag.WaitGroup:
        return new WaitGroup(new DataView(this.memory.buffer, heap_addr, WORD_SIZE * 2))
      case PointerTag.Mutex:
        return new Mutex(new DataView(this.memory.buffer, heap_addr, WORD_SIZE))
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
    this.memory.setFloat64(ptr_heap_addr + WORD_SIZE, value)
    return ptr_heap_addr
  }

  /* Memory Layout of an AST Node: [0:tag, 1-2:astId, 3-4:_unused_, 5-6:size, 7:_unused_] (1 word) */
  private allocateAstNode({ uid }: Node): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.AstNode)
    this.memory.setInt16(ptr_heap_addr + 1, uid as number)
    return ptr_heap_addr
  }

  /* Memory Layout of a Unary/Binary Op: [0:tag, 1-2:opNodeId, 3-4:_unused_, 5-6:size, 7:_unused_] (1 word) */
  private allocateUnaryBinaryOp({ type, opNodeId }: UnaryOp | BinaryOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(
      type === CommandType.UnaryOp ? PointerTag.UnaryOp : PointerTag.BinaryOp
    )
    this.memory.setInt16(ptr_heap_addr + 1, opNodeId)
    return ptr_heap_addr
  }

  /* Memory Layout of a VarDeclOp: [0:tag, 1-2:idNodeUid, 3-4:_unused_, 5-6:size, 7:isZeroValue] (1 word) */
  private allocateVarDeclOp({ zeroValue, idNodeUid }: VarDeclOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.VarDeclOp)
    this.memory.setInt16(ptr_heap_addr + 1, idNodeUid)
    this.memory.setInt8(ptr_heap_addr + 7, zeroValue ? 1 : 0)
    return ptr_heap_addr
  }

  /* Memory Layout of an AssignOp: [0:tag, 1-2:idNodeUid, 3-4:_unused_, 5-6:size, 7:_unused_] (1 word) */
  private allocateAssignOp({ idNodeUid }: AssignOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.AssignOp)
    this.memory.setInt16(ptr_heap_addr + 1, idNodeUid)
    return ptr_heap_addr
  }

  /* Memory Layout of a CallOp: [0:tag, 1-2:calleeNodeId, 3-4:arity, 5-6:size, 7:_unused_] (1 word) */
  private allocateCallOp({ type, calleeNodeId, arity }: CallOp | GoRoutineOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(
      type === CommandType.CallOp ? PointerTag.CallOp : PointerTag.GoRoutineOp
    )
    // NOTE: assume there will be no more than 2^16 AST nodes
    this.memory.setInt16(ptr_heap_addr + 1, calleeNodeId)
    // NOTE: assume there will be no more than 2^16 arguments
    this.memory.setInt16(ptr_heap_addr + 3, arity)
    return ptr_heap_addr
  }

  /* Memory Layout of a BuiltinOp: [0:tag, 1-2: arity, 3-4:id, 5-6:size, 7:_unused_] (1 word) */
  private allocateBuiltinOp({ arity, id }: BuiltinOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.BuiltInOp)
    // NOTE: assume there will be no arity greater than 2^16
    this.memory.setInt16(ptr_heap_addr + 1, arity ?? -1)
    // NOTE: assume there are no more than 2^16 built-in operations
    this.memory.setInt16(ptr_heap_addr + 3, id)
    return ptr_heap_addr
  }

  /* Memory Layout of a ClosureOp: [0:tag, 1-2:funcDeclNodeUid, 3-4:envId, 5-6:size, 7:_unused_] (1 word) */
  private allocateClosureOp({ funcDeclNodeUid, envId }: ClosureOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.ClosureOp)
    // NOTE: assume there will be no more than 2^16 AST nodes
    this.memory.setInt16(ptr_heap_addr + 1, funcDeclNodeUid)
    // NOTE: assume there will be no more than 2^16 envs
    this.memory.setInt16(ptr_heap_addr + 3, envId)
    return ptr_heap_addr
  }

  /* Memory Layout of an EnvOp: [0:tag, 1-2:envId, 3-4:_unused_, 5-6:size, 7:_unused_] (1 word) */
  private allocateEnvOp({ envId }: EnvOp): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.EnvOp)
    // NOTE: assume there will be no more than 2^16 envs
    this.memory.setInt16(ptr_heap_addr + 1, envId)
    return ptr_heap_addr
  }

  /* Memory Layout of an BufferedChannel:
   * [0:tag, 1-2:recvId, 3-4:sendId, 5-6:bufSize, 7:hasSynced] (2 words)
   */
  public allocateUnbufferedChan(): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.UnbufferedChannel, 2)
    this.memory.setInt16(ptr_heap_addr + 1, -1) // initialize recvId to -1
    this.memory.setInt16(ptr_heap_addr + 3, -1) // initialize sendId to -1
    this.memory.setUint8(ptr_heap_addr + 7, 0) // initialize hasSynced to false
    return ptr_heap_addr
  }

  /* Memory Layout of an BufferedChannel:
   * [0:tag, 1:readIdx, 2:writeIdx, 3:bufSize, 4:_unused_, 5-6:bufSize, 7:_unused_] (1 + `size` words)
   */
  public allocateBufferedChan(size: number): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.BufferedChannel, size)
    this.memory.setUint8(ptr_heap_addr + 1, 0) // initialize read index to 0
    this.memory.setUint8(ptr_heap_addr + 2, 0) // initialize write index to 0
    this.memory.setUint8(ptr_heap_addr + 3, 0) // initialize buffer size to 0
    return ptr_heap_addr
  }
  /* Memory Layout of a WaitGroup: [0-7:tag][0-7:count] (2 words) */
  public allocateWaitGroup(): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.WaitGroup, 2)
    this.memory.setFloat64(ptr_heap_addr + WORD_SIZE, 0) // initialize count to 0
    
    return ptr_heap_addr
  }

  /* Memory Layout of a Mutex: [0:tag, 1:isLocked, 2-7:_unused_] (1 word) */
  public allocateMutex(): HeapAddress {
    const ptr_heap_addr = this.allocateTaggedPtr(PointerTag.Mutex)
    this.memory.setUint8(ptr_heap_addr + 7, 0) // initialize isLocked to false

    return ptr_heap_addr
  }

  /**
   * Allocate a tagged pointer in the heap
   *
   * Memory Layout of a tagged pointer (1 word):
   * [0:tag, 1-4:_unused_, 5-6:size, 7:_unused_]
   *
   * @param tag  The tag to be associated with the pointer
   * @param size The size of the underlying data structure (in words)
   * @returns Address of the allocated block
   */
  private allocateTaggedPtr(tag: PointerTag, size: number = 0): HeapAddress {
    let alloc_heap_addr = this.buddyAlloc((size + 1) * WORD_SIZE)

    if (alloc_heap_addr === -1) {
      // perform garbage collection
      const activeHeapAddresses = new Set<HeapAddress>()
      for (const gr of this.scheduler.activeGoRoutines) {
        for (const addr of gr.activeHeapAddresses()) {
          activeHeapAddresses.add(addr)
        }
      }

      let _totalFreedWords = 0 // DEBUG
      this.buddyBlockMap.forEach((_, addr) => {
        if (!activeHeapAddresses.has(addr) && this.tag(addr) !== PointerTag.AstNode) {
          _totalFreedWords += this.size(addr) + 1
          this.buddyFree(addr)
        }
      })
      console.log(`[Heap]: GC freed ${_totalFreedWords * WORD_SIZE} bytes of memory.`) // DEBUG

      // retry allocation
      alloc_heap_addr = this.buddyAlloc((size + 1) * WORD_SIZE)
      // if allocation still fails, we hard fail
      if (alloc_heap_addr === -1) { throw new OutOfMemoryError() } // prettier-ignore
    }

    // set the tag (1 byte) of the block
    this.memory.setInt8(alloc_heap_addr, tag)
    // set the size (2 bytes) of the underlying data structure
    this.memory.setUint16(alloc_heap_addr + SIZE_OFFSET, size)

    return alloc_heap_addr
  }

  /**
   * Get the tag of the tagged pointer
   *
   * @param heap_addr
   * @returns tag of the tagged pointer
   */
  private tag(heap_addr: HeapAddress): PointerTag {
    return this.memory.getInt8(heap_addr)
  }

  /**
   * Get the size of the underlying data structure of the tagged pointer
   *
   * @param heap_addr
   * @returns size of the underlying data structure
   */
  private size(heap_addr: HeapAddress): number {
    return this.memory.getUint16(heap_addr + SIZE_OFFSET)
  }
}
