import { Scheduler } from '../../scheduler';
import { AstMap } from '../astMap';
export type HeapAddress = number;
export declare class Heap {
    memory: DataView;
    private buddyBlocks;
    private buddyBlockMap;
    private astMap;
    private scheduler;
    constructor(astMap: AstMap, scheduler: Scheduler, heapSize?: number);
    private buddyAlloc;
    private buddySplit;
    private buddyFree;
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
    alloc(value: any): any;
    allocM(values: any[]): HeapAddress[];
    /**
     * Resolve a heap address to its underlying data/value
     *
     * @param heap_addr heap address of the value to be resolved
     * @returns the resolved value
     */
    resolve(heap_addr: any): any;
    resolveM(heap_addrs: any[]): any[];
    private allocateBoolean;
    private allocateNumber;
    private allocateAstNode;
    private allocateUnaryBinaryOp;
    private allocateVarDeclOp;
    private allocateAssignOp;
    private allocateCallOp;
    private allocateBuiltinOp;
    private allocateClosureOp;
    private allocateEnvOp;
    allocateUnbufferedChan(): HeapAddress;
    allocateBufferedChan(size: number): HeapAddress;
    allocateWaitGroup(): HeapAddress;
    allocateMutex(): HeapAddress;
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
    private allocateTaggedPtr;
    /**
     * Get the tag of the tagged pointer
     *
     * @param heap_addr
     * @returns tag of the tagged pointer
     */
    private tag;
    /**
     * Get the size of the underlying data structure of the tagged pointer
     *
     * @param heap_addr
     * @returns size of the underlying data structure
     */
    private size;
}
