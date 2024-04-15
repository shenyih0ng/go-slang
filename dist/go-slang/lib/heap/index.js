"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Heap = void 0;
const error_1 = require("../../error");
const types_1 = require("../../types");
const channel_1 = require("../channel");
const mutex_1 = require("../mutex");
const waitgroup_1 = require("../waitgroup");
const config_1 = require("./config");
const tags_1 = require("./tags");
function alignToWord(bytes) {
    return Math.ceil(bytes / config_1.WORD_SIZE) * config_1.WORD_SIZE;
}
function ceilPow2(n) {
    return 2 ** Math.ceil(Math.log2(n));
}
function getBuddyAddr(addr, bIdx) {
    return addr ^ (1 << bIdx);
}
class Heap {
    constructor(astMap, scheduler, heapSize = config_1.DEFAULT_HEAP_SIZE) {
        var _a;
        // map of heap addresses to their corresponding block size
        this.buddyBlockMap = new Map();
        this.astMap = astMap;
        this.scheduler = scheduler;
        console.log(`[Heap]: Initializing heap with size ${heapSize} bytes.`); // DEBUG
        this.memory = new DataView(new ArrayBuffer(heapSize));
        const buddyAllocSize = Math.ceil(Math.log2(heapSize));
        this.buddyBlocks = Array.from({ length: buddyAllocSize + 1 }, () => new Set());
        // initialize the block with the maximum size (= size of the entire heap)
        (_a = this.buddyBlocks.at(-1)) === null || _a === void 0 ? void 0 : _a.add(0);
    }
    buddyAlloc(bytes) {
        const allocSize = alignToWord(ceilPow2(bytes));
        const bIdx = Math.log2(allocSize);
        if (this.buddyBlocks[bIdx].size === 0 && !this.buddySplit(bIdx + 1)) {
            return -1;
        }
        const addr = this.buddyBlocks[bIdx].values().next().value;
        this.buddyBlocks[bIdx].delete(addr);
        this.buddyBlockMap.set(addr, bIdx);
        return addr;
    }
    buddySplit(idx) {
        if (idx >= this.buddyBlocks.length) {
            return false;
        }
        if (this.buddyBlocks[idx].size === 0 && !this.buddySplit(idx + 1)) {
            return false;
        }
        const addr = this.buddyBlocks[idx].values().next().value;
        this.buddyBlocks[idx].delete(addr);
        this.buddyBlocks[idx - 1].add(addr);
        this.buddyBlocks[idx - 1].add(getBuddyAddr(addr, idx - 1));
        return true;
    }
    buddyFree(addr) {
        const bIdx = this.buddyBlockMap.get(addr);
        if (bIdx === undefined) {
            throw new Error('Free is utilized on a non-allocated memory address.');
        }
        this.buddyBlocks[bIdx].add(addr);
        this.buddyBlockMap.delete(addr);
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
    alloc(value) {
        // JavaScript primitive values
        const valueType = typeof value;
        if (valueType === 'boolean') {
            return this.allocateBoolean(value);
        }
        else if (valueType === 'number') {
            return this.allocateNumber(value);
        }
        // AST nodes
        if ((0, types_1.isNode)(value)) {
            // we need to track the AST node to be able to resolve it later
            return this.allocateAstNode(this.astMap.track(value));
        }
        // ECE operations
        if ((0, types_1.isCommand)(value)) {
            switch (value.type) {
                case types_1.CommandType.VarDeclOp:
                    return this.allocateVarDeclOp(value);
                case types_1.CommandType.AssignOp:
                    return this.allocateAssignOp(value);
                case types_1.CommandType.UnaryOp:
                case types_1.CommandType.BinaryOp:
                    return this.allocateUnaryBinaryOp(value);
                case types_1.CommandType.CallOp:
                case types_1.CommandType.GoRoutineOp:
                    return this.allocateCallOp(value);
                case types_1.CommandType.BuiltinOp:
                    return this.allocateBuiltinOp(value);
                case types_1.CommandType.ClosureOp:
                    return this.allocateClosureOp(value);
                case types_1.CommandType.EnvOp:
                    return this.allocateEnvOp(value);
                case types_1.CommandType.PopSOp:
                    return this.allocateTaggedPtr(tags_1.PointerTag.PopSOp);
            }
        }
        // Make operation
        if ((0, types_1.isMake)(value)) {
            switch (value.type) {
                case types_1.MakeType.Channel:
                    const { size: bufSize } = value;
                    return bufSize === 0 ? this.allocateUnbufferedChan() : this.allocateBufferedChan(bufSize);
            }
        }
        // New operation
        if ((0, types_1.isNew)(value)) {
            switch (value.type) {
                case types_1.NewType.WaitGroup:
                    return this.allocateWaitGroup();
                case types_1.NewType.Mutex:
                    return this.allocateMutex();
            }
        }
        return value;
    }
    allocM(values) {
        return values.map(this.alloc.bind(this));
    }
    /**
     * Resolve a heap address to its underlying data/value
     *
     * @param heap_addr heap address of the value to be resolved
     * @returns the resolved value
     */
    resolve(heap_addr) {
        if (typeof heap_addr !== 'number') {
            // TEMP: if the value is not a heap address, return the value as is
            return heap_addr;
        }
        const tag = this.tag(heap_addr);
        switch (tag) {
            case tags_1.PointerTag.False:
                return false;
            case tags_1.PointerTag.True:
                return true;
            case tags_1.PointerTag.Number:
                return this.memory.getFloat64(heap_addr + 1 * config_1.WORD_SIZE);
            case tags_1.PointerTag.AstNode:
                return this.astMap.get(this.memory.getInt16(heap_addr + 1));
            case tags_1.PointerTag.VarDeclOp:
                return {
                    type: types_1.CommandType.VarDeclOp,
                    idNodeUid: this.memory.getInt16(heap_addr + 1),
                    zeroValue: this.memory.getInt8(heap_addr + 7) === 1
                };
            case tags_1.PointerTag.AssignOp:
                return {
                    type: types_1.CommandType.AssignOp,
                    idNodeUid: this.memory.getInt16(heap_addr + 1)
                };
            case tags_1.PointerTag.UnaryOp:
            case tags_1.PointerTag.BinaryOp:
                return {
                    type: tag === tags_1.PointerTag.UnaryOp ? types_1.CommandType.UnaryOp : types_1.CommandType.BinaryOp,
                    opNodeId: this.memory.getInt16(heap_addr + 1)
                };
            case tags_1.PointerTag.CallOp:
            case tags_1.PointerTag.GoRoutineOp:
                return {
                    type: tag === tags_1.PointerTag.CallOp ? types_1.CommandType.CallOp : types_1.CommandType.GoRoutineOp,
                    calleeNodeId: this.memory.getInt16(heap_addr + 1),
                    arity: this.memory.getInt16(heap_addr + 3)
                };
            case tags_1.PointerTag.BuiltInOp:
                return {
                    type: types_1.CommandType.BuiltinOp,
                    arity: this.memory.getInt16(heap_addr + 1),
                    id: this.memory.getInt16(heap_addr + 3)
                };
            case tags_1.PointerTag.ClosureOp:
                return {
                    type: types_1.CommandType.ClosureOp,
                    funcDeclNodeUid: this.memory.getInt16(heap_addr + 1),
                    envId: this.memory.getInt16(heap_addr + 3)
                };
            case tags_1.PointerTag.EnvOp:
                return {
                    type: types_1.CommandType.EnvOp,
                    envId: this.memory.getInt16(heap_addr + 1)
                };
            case tags_1.PointerTag.PopSOp:
                return types_1.PopS;
            case tags_1.PointerTag.UnbufferedChannel:
                return new channel_1.UnbufferedChannel(new DataView(this.memory.buffer, heap_addr, config_1.WORD_SIZE * 2));
            case tags_1.PointerTag.BufferedChannel:
                const chanMaxBufSize = this.size(heap_addr);
                const chanMemRegion = new DataView(this.memory.buffer, heap_addr, 
                // +1 to include the tagged pointer
                config_1.WORD_SIZE * (chanMaxBufSize + 1));
                return new channel_1.BufferedChannel(chanMemRegion);
            case tags_1.PointerTag.WaitGroup:
                return new waitgroup_1.WaitGroup(new DataView(this.memory.buffer, heap_addr, config_1.WORD_SIZE));
            case tags_1.PointerTag.Mutex:
                return new mutex_1.Mutex(new DataView(this.memory.buffer, heap_addr, config_1.WORD_SIZE));
        }
    }
    resolveM(heap_addrs) {
        return heap_addrs.map(this.resolve.bind(this));
    }
    allocateBoolean(value) {
        // booleans are represented as tagged pointers with no underlying data
        return this.allocateTaggedPtr(value ? tags_1.PointerTag.True : tags_1.PointerTag.False, 0);
    }
    /* Memory Layout of a Number: [0-7:ptr][0-7:data] (2 words) */
    allocateNumber(value) {
        const ptr_heap_addr = this.allocateTaggedPtr(tags_1.PointerTag.Number, 1);
        this.memory.setFloat64(ptr_heap_addr + config_1.WORD_SIZE, value);
        return ptr_heap_addr;
    }
    /* Memory Layout of an AST Node: [0:tag, 1-2:astId, 3-4:_unused_, 5-6:size, 7:_unused_] (1 word) */
    allocateAstNode({ uid }) {
        const ptr_heap_addr = this.allocateTaggedPtr(tags_1.PointerTag.AstNode);
        this.memory.setInt16(ptr_heap_addr + 1, uid);
        return ptr_heap_addr;
    }
    /* Memory Layout of a Unary/Binary Op: [0:tag, 1-2:opNodeId, 3-4:_unused_, 5-6:size, 7:_unused_] (1 word) */
    allocateUnaryBinaryOp({ type, opNodeId }) {
        const ptr_heap_addr = this.allocateTaggedPtr(type === types_1.CommandType.UnaryOp ? tags_1.PointerTag.UnaryOp : tags_1.PointerTag.BinaryOp);
        this.memory.setInt16(ptr_heap_addr + 1, opNodeId);
        return ptr_heap_addr;
    }
    /* Memory Layout of a VarDeclOp: [0:tag, 1-2:idNodeUid, 3-4:_unused_, 5-6:size, 7:isZeroValue] (1 word) */
    allocateVarDeclOp({ zeroValue, idNodeUid }) {
        const ptr_heap_addr = this.allocateTaggedPtr(tags_1.PointerTag.VarDeclOp);
        this.memory.setInt16(ptr_heap_addr + 1, idNodeUid);
        this.memory.setInt8(ptr_heap_addr + 7, zeroValue ? 1 : 0);
        return ptr_heap_addr;
    }
    /* Memory Layout of an AssignOp: [0:tag, 1-2:idNodeUid, 3-4:_unused_, 5-6:size, 7:_unused_] (1 word) */
    allocateAssignOp({ idNodeUid }) {
        const ptr_heap_addr = this.allocateTaggedPtr(tags_1.PointerTag.AssignOp);
        this.memory.setInt16(ptr_heap_addr + 1, idNodeUid);
        return ptr_heap_addr;
    }
    /* Memory Layout of a CallOp: [0:tag, 1-2:calleeNodeId, 3-4:arity, 5-6:size, 7:_unused_] (1 word) */
    allocateCallOp({ type, calleeNodeId, arity }) {
        const ptr_heap_addr = this.allocateTaggedPtr(type === types_1.CommandType.CallOp ? tags_1.PointerTag.CallOp : tags_1.PointerTag.GoRoutineOp);
        // NOTE: assume there will be no more than 2^16 AST nodes
        this.memory.setInt16(ptr_heap_addr + 1, calleeNodeId);
        // NOTE: assume there will be no more than 2^16 arguments
        this.memory.setInt16(ptr_heap_addr + 3, arity);
        return ptr_heap_addr;
    }
    /* Memory Layout of a BuiltinOp: [0:tag, 1-2: arity, 3-4:id, 5-6:size, 7:_unused_] (1 word) */
    allocateBuiltinOp({ arity, id }) {
        const ptr_heap_addr = this.allocateTaggedPtr(tags_1.PointerTag.BuiltInOp);
        // NOTE: assume there will be no arity greater than 2^16
        this.memory.setInt16(ptr_heap_addr + 1, arity !== null && arity !== void 0 ? arity : -1);
        // NOTE: assume there are no more than 2^16 built-in operations
        this.memory.setInt16(ptr_heap_addr + 3, id);
        return ptr_heap_addr;
    }
    /* Memory Layout of a ClosureOp: [0:tag, 1-2:funcDeclNodeUid, 3-4:envId, 5-6:size, 7:_unused_] (1 word) */
    allocateClosureOp({ funcDeclNodeUid, envId }) {
        const ptr_heap_addr = this.allocateTaggedPtr(tags_1.PointerTag.ClosureOp);
        // NOTE: assume there will be no more than 2^16 AST nodes
        this.memory.setInt16(ptr_heap_addr + 1, funcDeclNodeUid);
        // NOTE: assume there will be no more than 2^16 envs
        this.memory.setInt16(ptr_heap_addr + 3, envId);
        return ptr_heap_addr;
    }
    /* Memory Layout of an EnvOp: [0:tag, 1-2:envId, 3-4:_unused_, 5-6:size, 7:_unused_] (1 word) */
    allocateEnvOp({ envId }) {
        const ptr_heap_addr = this.allocateTaggedPtr(tags_1.PointerTag.EnvOp);
        // NOTE: assume there will be no more than 2^16 envs
        this.memory.setInt16(ptr_heap_addr + 1, envId);
        return ptr_heap_addr;
    }
    /* Memory Layout of an BufferedChannel:
     * [0:tag, 1-2:recvId, 3-4:sendId, 5-6:bufSize, 7:hasSynced] (2 words)
     */
    allocateUnbufferedChan() {
        const ptr_heap_addr = this.allocateTaggedPtr(tags_1.PointerTag.UnbufferedChannel, 2);
        this.memory.setInt16(ptr_heap_addr + 1, -1); // initialize recvId to -1
        this.memory.setInt16(ptr_heap_addr + 3, -1); // initialize sendId to -1
        this.memory.setUint8(ptr_heap_addr + 7, 0); // initialize hasSynced to false
        return ptr_heap_addr;
    }
    /* Memory Layout of an BufferedChannel:
     * [0:tag, 1:readIdx, 2:writeIdx, 3:bufSize, 4:_unused_, 5-6:bufSize, 7:_unused_] (1 + `size` words)
     */
    allocateBufferedChan(size) {
        const ptr_heap_addr = this.allocateTaggedPtr(tags_1.PointerTag.BufferedChannel, size);
        this.memory.setUint8(ptr_heap_addr + 1, 0); // initialize read index to 0
        this.memory.setUint8(ptr_heap_addr + 2, 0); // initialize write index to 0
        this.memory.setUint8(ptr_heap_addr + 3, 0); // initialize buffer size to 0
        return ptr_heap_addr;
    }
    /* Memory Layout of a WaitGroup:
     * [0:tag, 1-4:count, 5-7:_unused] (1 word)
     */
    allocateWaitGroup() {
        const ptr_heap_addr = this.allocateTaggedPtr(tags_1.PointerTag.WaitGroup);
        this.memory.setFloat32(ptr_heap_addr + 1, 0); // initialize count to 0
        return ptr_heap_addr;
    }
    /* Memory Layout of a Mutex: [0:tag, 1-6:_unused, 7:isLocked] (1 word) */
    allocateMutex() {
        const ptr_heap_addr = this.allocateTaggedPtr(tags_1.PointerTag.Mutex);
        this.memory.setUint8(ptr_heap_addr + 7, 0); // initialize isLocked to false
        return ptr_heap_addr;
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
    allocateTaggedPtr(tag, size = 0) {
        let alloc_heap_addr = this.buddyAlloc((size + 1) * config_1.WORD_SIZE);
        if (alloc_heap_addr === -1) {
            // perform garbage collection
            const activeHeapAddresses = new Set();
            for (const gr of this.scheduler.activeGoRoutines) {
                for (const addr of gr.activeHeapAddresses()) {
                    activeHeapAddresses.add(addr);
                }
            }
            let _totalFreedWords = 0; // DEBUG
            this.buddyBlockMap.forEach((_, addr) => {
                if (!activeHeapAddresses.has(addr) && this.tag(addr) !== tags_1.PointerTag.AstNode) {
                    _totalFreedWords += this.size(addr) + 1;
                    this.buddyFree(addr);
                }
            });
            console.log(`[Heap]: GC freed ${_totalFreedWords * config_1.WORD_SIZE} bytes of memory.`); // DEBUG
            // retry allocation
            alloc_heap_addr = this.buddyAlloc((size + 1) * config_1.WORD_SIZE);
            // if allocation still fails, we hard fail
            if (alloc_heap_addr === -1) {
                throw new error_1.OutOfMemoryError();
            } // prettier-ignore
        }
        // set the tag (1 byte) of the block
        this.memory.setInt8(alloc_heap_addr, tag);
        // set the size (2 bytes) of the underlying data structure
        this.memory.setUint16(alloc_heap_addr + config_1.SIZE_OFFSET, size);
        return alloc_heap_addr;
    }
    /**
     * Get the tag of the tagged pointer
     *
     * @param heap_addr
     * @returns tag of the tagged pointer
     */
    tag(heap_addr) {
        return this.memory.getInt8(heap_addr);
    }
    /**
     * Get the size of the underlying data structure of the tagged pointer
     *
     * @param heap_addr
     * @returns size of the underlying data structure
     */
    size(heap_addr) {
        return this.memory.getUint16(heap_addr + config_1.SIZE_OFFSET);
    }
}
exports.Heap = Heap;
//# sourceMappingURL=index.js.map