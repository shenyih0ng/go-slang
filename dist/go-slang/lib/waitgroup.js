"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitGroup = void 0;
class WaitGroup {
    toString() {
        return `WaitGroup { count: ${this.getCount()} }`;
    }
    constructor(memory) {
        this.COUNT_OFFSET = 1;
        this.memory = memory;
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