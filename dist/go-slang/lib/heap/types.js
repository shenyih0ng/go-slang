"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeapObject = void 0;
class HeapObject {
    constructor(memory) {
        this.memory = memory;
    }
    get addr() {
        return this.memory.byteOffset;
    }
    isEqual(other) {
        // it is only equal if it is the same object in memory
        return this.addr === other.addr;
    }
}
exports.HeapObject = HeapObject;
//# sourceMappingURL=types.js.map