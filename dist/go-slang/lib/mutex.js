"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mutex = void 0;
const types_1 = require("./heap/types");
class Mutex extends types_1.HeapObject {
    toString() {
        return `Mutex { isLocked: ${this.getisLocked()} }`;
    }
    constructor(memory) {
        super(memory);
        this.LOCKED_OFFSET = 7;
    }
    getisLocked() {
        return this.memory.getUint8(this.LOCKED_OFFSET) === 1;
    }
    setisLocked(value) {
        this.memory.setUint8(this.LOCKED_OFFSET, value ? 1 : 0);
    }
    isLocked() {
        return this.getisLocked();
    }
    lock() {
        this.setisLocked(true);
    }
    unlock() {
        this.setisLocked(false);
    }
}
exports.Mutex = Mutex;
//# sourceMappingURL=mutex.js.map