"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitGroup = void 0;
const types_1 = require("./heap/types");
class WaitGroup extends types_1.HeapObject {
    toString() {
        return `WaitGroup { count: ${this.getCount()} }`;
    }
    constructor(memory) {
        super(memory);
        this.COUNT_OFFSET = 1;
    }
    getCount() {
        return this.memory.getFloat32(this.COUNT_OFFSET);
    }
    setCount(value) {
        this.memory.setFloat32(this.COUNT_OFFSET, value);
        return value;
    }
    add(n) {
        this.setCount(this.getCount() + n);
    }
    done() {
        return this.setCount(this.getCount() - 1);
    }
    wait() {
        return this.getCount() > 0;
    }
}
exports.WaitGroup = WaitGroup;
//# sourceMappingURL=waitgroup.js.map