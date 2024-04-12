"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoParser = void 0;
const errors_1 = require("../errors");
const go_js_1 = require("../../go-slang/parser/go.js");
class GoParser {
    parse(programStr, context, options, throwOnError) {
        try {
            return (0, go_js_1.parse)(programStr);
        }
        catch (error) {
            const location = error.location;
            error = new errors_1.FatalSyntaxError({
                start: { line: location.start.line, column: location.start.column },
                end: { line: location.end.line, column: location.end.column },
                source: location.source
            }, error.toString());
            if (throwOnError)
                throw error;
            context.errors.push(error);
        }
        return null;
    }
    validate(ast, context, throwOnError) {
        return true;
    }
}
exports.GoParser = GoParser;
//# sourceMappingURL=index.js.map