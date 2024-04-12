"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CseError = exports.CSEBreak = exports.InstrType = void 0;
var InstrType;
(function (InstrType) {
    InstrType["RESET"] = "Reset";
    InstrType["WHILE"] = "While";
    InstrType["FOR"] = "For";
    InstrType["ASSIGNMENT"] = "Assignment";
    InstrType["UNARY_OP"] = "UnaryOperation";
    InstrType["BINARY_OP"] = "BinaryOperation";
    InstrType["POP"] = "Pop";
    InstrType["APPLICATION"] = "Application";
    InstrType["BRANCH"] = "Branch";
    InstrType["ENVIRONMENT"] = "Environment";
    InstrType["ARRAY_LITERAL"] = "ArrayLiteral";
    InstrType["ARRAY_ACCESS"] = "ArrayAccess";
    InstrType["ARRAY_ASSIGNMENT"] = "ArrayAssignment";
    InstrType["ARRAY_LENGTH"] = "ArrayLength";
    InstrType["MARKER"] = "Marker";
    InstrType["CONTINUE"] = "Continue";
    InstrType["CONTINUE_MARKER"] = "ContinueMarker";
    InstrType["BREAK"] = "Break";
    InstrType["BREAK_MARKER"] = "BreakMarker";
    InstrType["GENERATE_CONT"] = "GenerateContinuation";
    InstrType["RESUME_CONT"] = "ResumeContinuation";
})(InstrType = exports.InstrType || (exports.InstrType = {}));
// Special class that cannot be found on the stash so is safe to be used
// as an indicator of a breakpoint from running the CSE machine
class CSEBreak {
}
exports.CSEBreak = CSEBreak;
// Special value that cannot be found on the stash so is safe to be used
// as an indicator of an error from running the CSE machine
class CseError {
    constructor(error) {
        this.error = error;
    }
}
exports.CseError = CseError;
//# sourceMappingURL=types.js.map