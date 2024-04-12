"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = void 0;
const utils_1 = require("../cse-machine/utils");
const astMap_1 = require("./lib/astMap");
const env_1 = require("./lib/env");
const heap_1 = require("./lib/heap");
const predeclared_1 = require("./lib/predeclared");
const scheduler_1 = require("./scheduler");
const types_1 = require("./types");
function evaluate(program, heapSize, slangContext) {
    const scheduler = new scheduler_1.Scheduler(slangContext);
    const C = new utils_1.Stack();
    const S = new utils_1.Stack();
    const E = new env_1.Environment(Object.assign({}, predeclared_1.PREDECLARED_IDENTIFIERS));
    // `SourceFile` is the root node of the AST which has latest (monotonically increasing) uid of all AST nodes
    // Therefore, the next uid to be used to track AST nodes is the uid of SourceFile + 1
    const A = new astMap_1.AstMap(program.uid + 1);
    const H = new heap_1.Heap(A, scheduler, heapSize);
    // inject predeclared functions into the global environment
    const B = new Map();
    predeclared_1.PREDECLARED_FUNCTIONS.forEach(({ name, func, op }, id) => {
        E.declare(name, Object.assign(Object.assign({}, op), { id }));
        if (name === 'println') {
            // println is special case where we need to the `rawDisplay` slang builtin for
            // console capture, therefore we handle it differently from other predeclared functions
            // NOTE: we assume that the `rawDisplay` builtin always exists
            B.set(id, func(slangContext.nativeStorage.builtins.get('slangRawDisplay')));
            return;
        }
        B.set(id, func);
    });
    // seed the `main` go routine with the program's `main` function
    const CALL_MAIN = {
        type: types_1.NodeType.CallExpression,
        callee: { type: types_1.NodeType.Identifier, name: 'main' },
        args: []
    };
    C.pushR(H.alloc(program), H.alloc(CALL_MAIN));
    scheduler.spawn({ C, S, E, B, H, A }, true);
    scheduler.run();
    return 'Program exited';
}
exports.evaluate = evaluate;
//# sourceMappingURL=ece.js.map