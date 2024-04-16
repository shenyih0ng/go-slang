"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateBinaryOp = exports.evaluateUnaryOp = void 0;
const error_1 = require("../error");
const types_1 = require("./heap/types");
const utils_1 = require("./utils");
function _typeof(value) {
    if (value instanceof types_1.HeapObject) {
        return 'heapObj';
    }
    const typeName = typeof value;
    return typeName === 'number' ? 'int' : typeName;
}
function isSameType(left, right) {
    return _typeof(left) === _typeof(right);
}
function evaluateArthmeticOp(operator, left, right) {
    if (!isSameType(left, right)) {
        return utils_1.Result.fail(new error_1.InvalidOperationError(`${left} ${operator} ${right} (mismatched types ${_typeof(left)} and ${_typeof(right)})`));
    }
    const allowedTypes = operator === '%' ? ['int'] : ['int', 'string'];
    if (!allowedTypes.includes(_typeof(left))) {
        return utils_1.Result.fail(new error_1.InvalidOperationError(`operator ${operator} not defined on ${left} (${_typeof(left)})`));
    }
    if (!allowedTypes.includes(_typeof(right))) {
        return utils_1.Result.fail(new error_1.InvalidOperationError(`operator ${operator} not defined on ${right} (${_typeof(right)})`));
    }
    let result = undefined;
    switch (operator) {
        case '+':
            result = left + right;
            break;
        case '-':
            result = left - right;
            break;
        case '*':
            result = left * right;
            break;
        case '/':
            // NOTE: this calculates the quotient
            result = Math.floor(left / right);
            break;
        case '%':
            result = left % right;
            break;
    }
    return utils_1.Result.ok(result);
}
function evaluateBitwiseOp(operator, left, right) {
    if (!isSameType(left, right)) {
        return utils_1.Result.fail(new error_1.InvalidOperationError(`${left} ${operator} ${right} (mismatched types ${_typeof(left)} and ${_typeof(right)})`));
    }
    const allowedTypes = ['int'];
    if (!allowedTypes.includes(_typeof(left))) {
        return utils_1.Result.fail(new error_1.InvalidOperationError(`operator ${operator} not defined on ${left} (${_typeof(left)})`));
    }
    if (!allowedTypes.includes(_typeof(right))) {
        return utils_1.Result.fail(new error_1.InvalidOperationError(`operator ${operator} not defined on ${right} (${_typeof(right)})`));
    }
    if ((operator === '<<' || operator === '>>') && right < 0) {
        return utils_1.Result.fail(new error_1.InvalidOperationError(`negative shift count ${right}`));
    }
    let result = undefined;
    switch (operator) {
        case '|':
            result = left | right;
            break;
        case '&':
            result = left & right;
            break;
        case '^':
            result = left ^ right;
            break;
        case '&^':
            result = left & ~right;
            break;
        case '<<':
            result = left << right;
            break;
        case '>>':
            result = left >> right;
            break;
    }
    return utils_1.Result.ok(result);
}
function evaluateRelationalOp(operator, left, right) {
    if (!isSameType(left, right)) {
        return utils_1.Result.fail(new error_1.InvalidOperationError(`${left} ${operator} ${right} (mismatched types ${_typeof(left)} and ${_typeof(right)})`));
    }
    if (_typeof(left) === 'heapObj') {
        if (operator !== '==' && operator !== '!=') {
            return utils_1.Result.fail(new error_1.InvalidOperationError(`${left} ${operator} ${right} (operator ${operator} not defined on chan)`));
        }
        // compare the memory address of the two heap objects
        left = left.addr;
        right = right.addr;
    }
    let result = undefined;
    switch (operator) {
        case '==':
            result = left == right;
            break;
        case '!=':
            result = left != right;
            break;
        case '<':
            result = left < right;
            break;
        case '<=':
            result = left <= right;
            break;
        case '>':
            result = left > right;
            break;
        case '>=':
            result = left >= right;
            break;
    }
    return utils_1.Result.ok(result);
}
function evaluateLogicalOp(operator, left, right) {
    if (!isSameType(left, right)) {
        return utils_1.Result.fail(new error_1.InvalidOperationError(`${left} ${operator} ${right} (mismatched types ${_typeof(left)} and ${_typeof(right)})`));
    }
    const allowedTypes = ['boolean'];
    if (!allowedTypes.includes(_typeof(left))) {
        return utils_1.Result.fail(new error_1.InvalidOperationError(`operator ${operator} not defined on ${left} (${_typeof(left)})`));
    }
    if (!allowedTypes.includes(_typeof(right))) {
        return utils_1.Result.fail(new error_1.InvalidOperationError(`operator ${operator} not defined on ${right} (${_typeof(right)})`));
    }
    let result = undefined;
    switch (operator) {
        case '&&':
            result = left && right;
            break;
        case '||':
            result = left || right;
            break;
    }
    return utils_1.Result.ok(result);
}
function evaluateUnaryOp(operator, value) {
    const valueType = _typeof(value);
    if (((operator === '+' || operator === '-' || operator === '^') && valueType !== 'int') ||
        (operator === '!' && valueType !== 'boolean')) {
        return utils_1.Result.fail(new error_1.InvalidOperationError(`operator ${operator} not defined on ${value} (${valueType})`));
    }
    let result = undefined;
    switch (operator) {
        case '+':
            result = +value;
            break;
        case '-':
            result = -value;
            break;
        case '!':
            result = !value;
            break;
        case '^':
            result = value ^ -1;
            break;
    }
    return utils_1.Result.ok(result);
}
exports.evaluateUnaryOp = evaluateUnaryOp;
function evaluateBinaryOp(operator, left, right) {
    switch (operator) {
        case '+':
        case '-':
        case '*':
        case '/':
        case '%':
            return evaluateArthmeticOp(operator, left, right);
        case '|':
        case '&':
        case '^':
        case '&^':
        case '<<':
        case '>>':
            return evaluateBitwiseOp(operator, left, right);
        case '==':
        case '!=':
        case '<':
        case '<=':
        case '>':
        case '>=':
            return evaluateRelationalOp(operator, left, right);
        case '&&':
        case '||':
            return evaluateLogicalOp(operator, left, right);
    }
}
exports.evaluateBinaryOp = evaluateBinaryOp;
//# sourceMappingURL=operators.js.map