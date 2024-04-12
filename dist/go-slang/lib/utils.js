"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.benchmark = exports.Counter = exports.Result = exports.isAny = exports.zip = void 0;
const lodash_1 = require("lodash");
function zip(first, second) {
    const length = Math.min(first.length, second.length);
    const zipped = [];
    for (let index = 0; index < length; index++) {
        zipped.push([first[index], second[index]]);
    }
    return zipped;
}
exports.zip = zip;
/**
 * Check if a given (query) value is in a list of values.
 *
 * @param query
 * @param values
 * @returns true if the query value is in the list of values, false otherwise.
 */
function isAny(query, values) {
    return query ? values.some(v => (0, lodash_1.isEqual)(query, v)) : false;
}
exports.isAny = isAny;
class Result {
    constructor(isSuccess, error, value) {
        this.isSuccess = isSuccess;
        this.isFailure = !isSuccess;
        this.error = error;
        this.value = value;
        Object.freeze(this);
    }
    unwrap() {
        if (this.isFailure) {
            throw new Error('called `unwrap` on a failed result');
        }
        return this.value;
    }
    static ok(value) {
        return new Result(true, undefined, value);
    }
    static fail(error) {
        return new Result(false, error);
    }
}
exports.Result = Result;
// prettier-ignore
class Counter {
    constructor(start = 0) {
        this.count = 0;
        this.count = start;
    }
    next() { return this.count++; }
}
exports.Counter = Counter;
function benchmark(label) {
    function _benchmark(_target, _propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            const start = performance.now();
            const result = originalMethod.apply(this, args);
            console.log(`[${label}] exec time: ${(performance.now() - start).toFixed(2)}ms`);
            return result;
        };
        return descriptor;
    }
    return _benchmark;
}
exports.benchmark = benchmark;
//# sourceMappingURL=utils.js.map