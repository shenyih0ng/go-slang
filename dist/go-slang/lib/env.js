"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = void 0;
const utils_1 = require("./utils");
class Environment {
    constructor(bindings) {
        this.frameMap = new Map();
        this.frameIdCounter = new utils_1.Counter(0);
        if (bindings) {
            this.currFrame = this.newFrame(bindings);
        } // prettier-ignore
    }
    newFrame(bindings, parent = null) {
        const frame = {
            id: this.frameIdCounter.next(),
            bindings: new Map(Object.entries(bindings)),
            parent
        };
        this.frameMap.set(frame.id, frame);
        return frame;
    }
    id() {
        return this.currFrame.id;
    }
    setId(id) {
        this.currFrame = this.frameMap.get(id);
        return this;
    }
    declare(name, value) {
        this.currFrame.bindings.set(name, value);
    }
    declareZeroValue(name) {
        this.currFrame.bindings.set(name, 0);
    }
    assign(name, value) {
        let frame = this.currFrame;
        while (!frame.bindings.has(name)) {
            if (!frame.parent)
                return false;
            frame = frame.parent;
        }
        frame.bindings.set(name, value);
        return true;
    }
    lookup(name) {
        let frame = this.currFrame;
        while (!frame.bindings.has(name)) {
            if (!frame.parent)
                return null;
            frame = frame.parent;
        }
        return frame.bindings.get(name);
    }
    extend(bindings) {
        this.currFrame = this.newFrame(bindings, this.currFrame);
        return this;
    }
    copy() {
        const newEnv = new Environment();
        newEnv.frameMap = this.frameMap;
        newEnv.frameIdCounter = this.frameIdCounter;
        return newEnv;
    }
    activeHeapAddresses() {
        const activeAddrSet = new Set();
        this.frameMap.forEach(frame => {
            let curr = frame;
            while (curr) {
                frame.bindings.forEach(value => {
                    if (typeof value === 'number') {
                        activeAddrSet.add(value);
                    }
                });
                curr = curr.parent;
            }
        });
        return activeAddrSet;
    }
}
exports.Environment = Environment;
//# sourceMappingURL=env.js.map