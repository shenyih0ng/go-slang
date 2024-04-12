"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateBinaryOp = void 0;
function evaluateArthmeticOp(operator, left, right) {
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
    return result;
}
function evaluateBitwiseOp(operator, left, right) {
    let result = undefined;
    switch (operator) {
        case '|':
            result = left | right;
            break;
        case '^':
            result = left ^ right;
            break;
    }
    return result;
}
function evaluateRelationalOp(operator, left, right) {
    let result = undefined;
    switch (operator) {
        case '==':
            result = left === right;
            break;
        case '!=':
            result = left !== right;
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
    return result;
}
function evaluateBinaryOp(operator, left, right) {
    let result = undefined;
    switch (operator) {
        case '+':
        case '-':
        case '*':
        case '/':
        case '%':
            result = evaluateArthmeticOp(operator, left, right);
            break;
        case '|':
        case '^':
            result = evaluateBitwiseOp(operator, left, right);
            break;
        case '==':
        case '!=':
        case '<':
        case '<=':
        case '>':
        case '>=':
            result = evaluateRelationalOp(operator, left, right);
            break;
    }
    return result;
}
exports.evaluateBinaryOp = evaluateBinaryOp;
//# sourceMappingURL=binaryOp.js.map