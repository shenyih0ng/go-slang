"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREDECLARED_FUNCTIONS = exports.PREDECLARED_IDENTIFIERS = void 0;
const error_1 = require("../error");
const types_1 = require("../types");
exports.PREDECLARED_IDENTIFIERS = {
    true: true,
    false: false,
    'sync.WaitGroup': types_1.NewType.WaitGroup,
    'sync.Mutex': types_1.NewType.Mutex
};
/**
 * println is a predeclared function in Go that prints values to stdout.
 *
 * println wraps around the rawDisplay function that contains the console capture.
 * Since there is no way to directly output to frontend, we have to make sure of slang's native
 * rawDisplay function to capture the output and display it in the frontend.
 *
 * @param slangRawDisplay rawDisplay function that contains the console capture
 * @returns a function that takes any number of arguments and prints them to the console
 */
function println(slangRawDisplay) {
    return (...args) => void slangRawDisplay(args.map((arg) => (arg != undefined ? arg.toString() : '(no value)')).join(' '));
}
function make(...args) {
    if (args.length === 0) {
        return new error_1.InvalidOperationError(`not enough arguments for make() (expected 1, found 0)`);
    }
    const type = args[0];
    if (!(0, types_1.isTypeLiteral)(type)) {
        return new error_1.InvalidOperationError(`make: first argument must be a type; ${type} is not a type`);
    }
    if (type.value === types_1.MakeType.Channel) {
        if (args.length > 2) {
            return new error_1.InvalidOperationError(`make(${types_1.MakeType.Channel}, ${args.slice(1).join(', ')}) expects 1 or 2 arguments; found ${args.length}`);
        }
        if (args.length === 2) {
            if (typeof args[1] !== 'number') {
                return new error_1.InvalidOperationError(`make(${types_1.MakeType.Channel}, ${args[1]})}) expects second argument to be a number; found ${args[1]}`);
            }
            if (args[1] < 0) {
                return new error_1.InvalidOperationError(`make(${types_1.MakeType.Channel}, ${args[1]})}) expects second argument to be a non-negative number; found ${args[1]}`);
            }
        }
        return { type: types_1.MakeType.Channel, size: args.length === 2 ? args[1] : 0 };
    }
    // NOTE: this should be unreachable
    return new error_1.InvalidOperationError(`make: cannot make type ${type.value}`);
}
function _new(...args) {
    if (args.length === 0) {
        return new error_1.InvalidOperationError(`not enough arguments for new() (expected 1, found 0)`);
    }
    const type = args[0];
    if (!(0, types_1.isTypeLiteral)(type)) {
        return new error_1.InvalidOperationError(`new: first argument must be a type; ${type} is not a type`);
    }
    if (type.value === types_1.NewType.WaitGroup) {
        if (args.length > 1) {
            return new error_1.InvalidOperationError(`new(${types_1.NewType.WaitGroup}, ${args.slice(1).join(', ')}) expects 1 argument; found ${args.length}`);
        }
        return { type: types_1.NewType.WaitGroup, count: 0 };
    }
    if (type.value === types_1.NewType.Mutex) {
        if (args.length > 1) {
            return new error_1.InvalidOperationError(`new(${types_1.NewType.Mutex}, ${args.slice(1).join(', ')}) expects 1 arguments; found ${args.length}`);
        }
        return { type: types_1.NewType.Mutex };
    }
    // NOTE: this should be unreachable
    return new error_1.InvalidOperationError(`new: cannot make type ${type.value}`);
}
exports.PREDECLARED_FUNCTIONS = [
    {
        name: 'println',
        func: println,
        op: { type: types_1.CommandType.BuiltinOp, arity: undefined }
    },
    {
        name: 'make',
        func: make,
        op: { type: types_1.CommandType.BuiltinOp, arity: 2 }
    },
    {
        name: 'new',
        func: _new,
        op: { type: types_1.CommandType.BuiltinOp, arity: 1 }
    }
];
//# sourceMappingURL=predeclared.js.map