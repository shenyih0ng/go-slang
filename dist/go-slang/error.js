"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalError = exports.OutOfMemoryError = exports.DeadLockError = exports.GoExprMustBeFunctionCallError = exports.FuncArityError = exports.AssignmentOperationError = exports.RedeclarationError = exports.UndefinedError = exports.InvalidOperationError = exports.UnknownInstructionError = void 0;
const runtimeSourceError_1 = require("../errors/runtimeSourceError");
class UnknownInstructionError extends runtimeSourceError_1.RuntimeSourceError {
    constructor(inst_type) {
        super();
        this.inst_type = inst_type;
    }
    explain() {
        return `Unknown instruction ${this.inst_type}.`;
    }
    elaborate() {
        return `The instruction ${this.inst_type} is not supported by the interpreter. This is likely a bug in the interpreter. Please report this issue.`;
    }
}
exports.UnknownInstructionError = UnknownInstructionError;
class InvalidOperationError extends runtimeSourceError_1.RuntimeSourceError {
    constructor(errorMessage) {
        super();
        this.errorMessage = errorMessage;
    }
    explain() {
        return `invalid operation: ${this.errorMessage}`;
    }
}
exports.InvalidOperationError = InvalidOperationError;
class UndefinedError extends runtimeSourceError_1.RuntimeSourceError {
    constructor(identifier, location) {
        super();
        this.identifier = identifier;
        this.location = location;
    }
    explain() {
        return `undefined: ${this.identifier}`;
    }
}
exports.UndefinedError = UndefinedError;
class RedeclarationError extends runtimeSourceError_1.RuntimeSourceError {
    constructor(identifier, location) {
        super();
        this.identifier = identifier;
        this.location = location;
    }
    explain() {
        return `${this.identifier} redeclared in this block`;
    }
}
exports.RedeclarationError = RedeclarationError;
class AssignmentOperationError extends runtimeSourceError_1.RuntimeSourceError {
    constructor(location) {
        super();
        this.location = location;
    }
    explain() {
        return 'assigmment operation requires single-valued expressions on both sides';
    }
}
exports.AssignmentOperationError = AssignmentOperationError;
class FuncArityError extends runtimeSourceError_1.RuntimeSourceError {
    constructor(func_name, n_actual, n_expected, location) {
        super();
        this.func_name = func_name;
        this.n_actual = n_actual;
        this.n_expected = n_expected;
        this.location = location;
    }
    explain() {
        return (`${this.n_actual - this.n_expected < 0 ? 'not enough' : 'too many'} arguments in call to ${this.func_name}` +
            `\n  have ${this.n_actual}` +
            `\n  want ${this.n_expected}`);
    }
}
exports.FuncArityError = FuncArityError;
class GoExprMustBeFunctionCallError extends runtimeSourceError_1.RuntimeSourceError {
    constructor(expr, location) {
        super();
        this.expr = expr;
        this.location = location;
    }
    explain() {
        return `expression in go must be function call, not ${this.expr}`;
    }
}
exports.GoExprMustBeFunctionCallError = GoExprMustBeFunctionCallError;
class DeadLockError extends runtimeSourceError_1.RuntimeSourceError {
    explain() {
        return 'all goroutines are asleep - deadlock!';
    }
}
exports.DeadLockError = DeadLockError;
class OutOfMemoryError extends runtimeSourceError_1.RuntimeSourceError {
    explain() {
        return 'runtime: out of memory';
    }
}
exports.OutOfMemoryError = OutOfMemoryError;
class InternalError extends runtimeSourceError_1.RuntimeSourceError {
    constructor(message) {
        super();
        this.message = message;
    }
    explain() {
        return `internal error: ${this.message}\nPlease report this issue.`;
    }
}
exports.InternalError = InternalError;
//# sourceMappingURL=error.js.map