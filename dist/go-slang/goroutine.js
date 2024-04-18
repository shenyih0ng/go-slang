"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoRoutine = exports.GoRoutineState = void 0;
const lodash_1 = require("lodash");
const utils_1 = require("../cse-machine/utils");
const runtimeSourceError_1 = require("../errors/runtimeSourceError");
const error_1 = require("./error");
const operators_1 = require("./lib/operators");
const utils_2 = require("./lib/utils");
const types_1 = require("./types");
const channel_1 = require("./lib/channel");
const waitgroup_1 = require("./lib/waitgroup");
const mutex_1 = require("./lib/mutex");
var GoRoutineState;
(function (GoRoutineState) {
    GoRoutineState[GoRoutineState["Running"] = 0] = "Running";
    GoRoutineState[GoRoutineState["Blocked"] = 1] = "Blocked";
    GoRoutineState[GoRoutineState["Exited"] = 2] = "Exited";
})(GoRoutineState = exports.GoRoutineState || (exports.GoRoutineState = {}));
class GoRoutine {
    constructor(id, context, scheduler, isMain = false) {
        // used to determine if the goroutine made progress in the last tick
        this.progress = false;
        this.prevInst = null;
        this.id = id;
        this.state = GoRoutineState.Running;
        this.context = context;
        this.scheduler = scheduler;
        this.isMain = isMain;
    }
    activeHeapAddresses() {
        const activeAddrSet = new Set();
        // roots: Control, Stash, Environment
        const { C, S, E } = this.context;
        const isHeapAddr = (addr) => typeof addr === 'number';
        C.getStack().filter(isHeapAddr).forEach(addr => activeAddrSet.add(addr)); // prettier-ignore
        S.getStack().filter(isHeapAddr).forEach(addr => activeAddrSet.add(addr)); // prettier-ignore
        return new Set([...activeAddrSet, ...E.activeHeapAddresses()]);
    }
    tick() {
        var _a;
        const { C, H } = this.context;
        const inst = H.resolve(C.pop());
        if (!Interpreter.hasOwnProperty(inst.type)) {
            this.state = GoRoutineState.Exited;
            return utils_2.Result.fail(new error_1.UnknownInstructionError(inst.type));
        }
        try {
            const nextState = (_a = Interpreter[inst.type](inst, this.context, this.scheduler, this.id)) !== null && _a !== void 0 ? _a : utils_2.Result.ok(C.isEmpty() ? GoRoutineState.Exited : GoRoutineState.Running);
            this.state = nextState.isSuccess ? nextState.unwrap() : GoRoutineState.Exited;
            this.progress = this.prevInst !== inst;
            this.prevInst = inst;
            return nextState;
        }
        catch (error) {
            this.state = GoRoutineState.Exited;
            return utils_2.Result.fail(error instanceof runtimeSourceError_1.RuntimeSourceError ? error : new error_1.InternalError(error.message));
        }
    }
}
exports.GoRoutine = GoRoutine;
const Interpreter = {
    SourceFile: ({ topLevelDecls }, { C, H }) => C.pushR(...H.allocM(topLevelDecls)),
    FunctionDeclaration: (funcDeclNode, { E, H, A }) => E.declare(funcDeclNode.id.name, H.alloc({
        type: types_1.CommandType.ClosureOp,
        funcDeclNodeUid: A.track(funcDeclNode).uid,
        envId: E.id()
    })),
    Block: ({ statements }, { C, E, H }) => {
        C.pushR(...H.allocM([...statements, { type: types_1.CommandType.EnvOp, envId: E.id() }]));
        E.extend({});
    },
    ReturnStatement: ({ expression }, { C, H }) => C.pushR(H.alloc(expression), H.alloc((0, types_1.PopTillM)((0, types_1.RetMarker)()))),
    IfStatement: ({ stmt, cond, cons, alt }, { C, H }) => {
        const branchOp = { type: types_1.CommandType.BranchOp, cons, alt };
        stmt
            ? C.push(H.alloc({
                type: types_1.NodeType.Block,
                statements: [stmt, { type: types_1.NodeType.IfStatement, cond, cons, alt }]
            }))
            : C.pushR(...H.allocM([cond, branchOp]));
    },
    ForStatement: (inst, { C, H }) => {
        const { form, block: forBlock } = inst;
        if (form.type === types_1.ForFormType.ForCondition) {
            const branch = { type: types_1.CommandType.BranchOp, cons: forBlock, alt: (0, types_1.PopTillM)((0, types_1.ForEndMarker)()) };
            C.pushR(...H.allocM([form.expression, branch, (0, types_1.ForStartMarker)(), inst, (0, types_1.ForEndMarker)()]));
        }
        else if (form.type === types_1.ForFormType.ForClause) {
            const { init, cond, post } = form;
            const initDeclIds = init && init.type === types_1.NodeType.VariableDeclaration ? init.left : [];
            const forCond = {
                type: types_1.NodeType.ForStatement,
                form: {
                    type: types_1.ForFormType.ForCondition,
                    expression: cond !== null && cond !== void 0 ? cond : { type: types_1.NodeType.Literal, value: true }
                },
                block: {
                    type: types_1.NodeType.Block,
                    statements: [
                        {
                            type: types_1.NodeType.Block,
                            statements: [
                                // eqv to: id = id (copy of init declarations with the current values)
                                { type: types_1.NodeType.VariableDeclaration, left: initDeclIds, right: initDeclIds },
                                ...forBlock.statements.concat((0, types_1.ForPostMarker)())
                            ]
                        },
                        post !== null && post !== void 0 ? post : types_1.EmptyStmt
                    ]
                }
            };
            C.push(H.alloc({ type: types_1.NodeType.Block, statements: [init !== null && init !== void 0 ? init : types_1.EmptyStmt, forCond] }));
        }
    },
    BreakStatement: (_inst, { C, H }) => C.push(H.alloc((0, types_1.PopTillM)((0, types_1.ForEndMarker)()))),
    ContinueStatement: (_inst, { C, H }) => C.push(H.alloc((0, types_1.PopTillM)((0, types_1.ForPostMarker)(), (0, types_1.ForStartMarker)()))),
    VariableDeclaration: ({ left, right }, { C, H, A }) => {
        const decls = A.trackM(left).map(({ uid }) => ({ type: types_1.CommandType.VarDeclOp, idNodeUid: uid }));
        return right.length === 0
            ? // if there is no right side, we push zero value for each declaration
                C.pushR(...H.allocM(decls.map(decl => (Object.assign(Object.assign({}, decl), { zeroValue: true })))))
            : // assume: left.length === right.length
                C.pushR(...H.allocM(right), ...H.allocM(decls.reverse()));
    },
    Assignment: ({ left, op, right }, { C, H, A }) => {
        const ids = left; // assume: left is always an array of identifiers
        const asgmts = ids.map(id => ({ type: types_1.CommandType.AssignOp, idNodeUid: A.track(id).uid }));
        const asgmts_alloc = H.allocM(asgmts.reverse());
        // assignment
        if (!op) {
            return C.pushR(...H.allocM(right), ...asgmts_alloc);
        }
        // assignment operation
        if (left.length !== 1 || right.length !== 1) {
            return utils_2.Result.fail(new error_1.AssignmentOperationError(op.loc));
        }
        C.pushR(...H.allocM((0, lodash_1.zip)(left, right)
            .map(([l, r]) => [l, r, { type: types_1.CommandType.BinaryOp, opNodeId: A.track(op).uid }])
            .flat()), ...asgmts_alloc);
    },
    GoStatement: ({ call, loc }, { C, H, A }) => {
        if (call.type !== types_1.NodeType.CallExpression) {
            return utils_2.Result.fail(new error_1.GoExprMustBeFunctionCallError(call.type, loc));
        }
        const { callee, args } = call;
        return void C.pushR(...H.allocM([
            callee,
            ...args,
            {
                type: types_1.CommandType.GoRoutineOp,
                calleeNodeId: A.track(callee).uid,
                arity: args.length
            }
        ]));
    },
    SendStatement: ({ channel, value }, { C, H }) => C.pushR(...H.allocM([value, channel, (0, types_1.ChanSend)()])),
    EmptyStatement: () => void {},
    Literal: (inst, { S, H }) => S.push(H.alloc(inst.value)),
    FunctionLiteral: (funcLitNode, { S, E, H }) => S.push(H.alloc({
        type: types_1.CommandType.ClosureOp,
        funcDeclNodeUid: funcLitNode.uid,
        envId: E.id()
    })),
    TypeLiteral: (inst, { S }) => S.push(inst),
    Identifier: ({ name, loc }, { S, E }) => {
        const value = E.lookup(name);
        return value === null ? utils_2.Result.fail(new error_1.UndefinedError(name, loc)) : S.push(value);
    },
    UnaryExpression: ({ argument, operator: op }, { C, H, A }) => C.pushR(...H.allocM([argument, { type: types_1.CommandType.UnaryOp, opNodeId: A.track(op).uid }])),
    BinaryExpression: ({ left, right, operator: op }, { C, H, A }) => C.pushR(...H.allocM([left, right, { type: types_1.CommandType.BinaryOp, opNodeId: A.track(op).uid }])),
    CallExpression: ({ callee, args }, { C, E, S, H, A }) => {
        var _a, _b;
        if (callee.type !== types_1.NodeType.QualifiedIdentifier) {
            return C.pushR(...H.allocM([
                callee,
                ...args,
                { type: types_1.CommandType.CallOp, calleeNodeId: A.track(callee).uid, arity: args.length }
            ]));
        }
        const qualifiedIdStr = callee.pkg.name + '.' + callee.method.name;
        const className = H.resolve(E.lookup(callee.pkg.name));
        if (className === null) {
            return utils_2.Result.fail(new error_1.UndefinedError(callee.pkg.name, callee.loc));
        }
        if (className instanceof waitgroup_1.WaitGroup) {
            const methodActions = {
                Add: () => ({ type: types_1.CommandType.WaitGroupAddOp, count: args[0].value }),
                Done: () => ({ type: types_1.CommandType.WaitGroupDoneOp }),
                Wait: () => ({ type: types_1.CommandType.WaitGroupWaitOp })
            };
            const action = (_a = methodActions[callee.method.name]) === null || _a === void 0 ? void 0 : _a.call(methodActions);
            if (!action) {
                return utils_2.Result.fail(new error_1.UndefinedError(qualifiedIdStr, callee.method.loc));
            }
            const waitGroupHeapAddress = E.lookup(callee.pkg.name);
            S.push(waitGroupHeapAddress);
            return C.push(action);
        }
        if (className instanceof mutex_1.Mutex) {
            const methodActions = {
                Lock: () => ({ type: types_1.CommandType.MutexLockOp }),
                Unlock: () => ({ type: types_1.CommandType.MutexUnlockOp })
            };
            const action = (_b = methodActions[callee.method.name]) === null || _b === void 0 ? void 0 : _b.call(methodActions);
            if (!action) {
                return utils_2.Result.fail(new error_1.UndefinedError(qualifiedIdStr, callee.method.loc));
            }
            const mutexHeapAddress = E.lookup(callee.pkg.name);
            S.push(mutexHeapAddress);
            return C.push(action);
        }
        // Should be unreachable
        return utils_2.Result.fail(new error_1.UndefinedError(qualifiedIdStr, callee.method.loc));
    },
    ExpressionStatement: ({ expression }, { C, H }) => C.pushR(...H.allocM([expression, types_1.PopS])),
    VarDeclOp: ({ idNodeUid, zeroValue }, { S, E, A }) => {
        const id = A.get(idNodeUid);
        const name = id.name;
        if (E.declaredInBlock(name)) {
            return utils_2.Result.fail(new error_1.RedeclarationError(name, id.loc));
        }
        return void zeroValue ? E.declareZeroValue(name) : E.declare(name, S.pop());
    },
    AssignOp: ({ idNodeUid }, { S, E, A }) => {
        const id = A.get(idNodeUid);
        !E.assign(id.name, S.pop()) ? new error_1.UndefinedError(id.name, id.loc) : void {};
    },
    UnaryOp: ({ opNodeId }, { C, S, H, A }) => {
        const operator = A.get(opNodeId).op;
        if (operator === '<-') {
            return C.push((0, types_1.ChanRecv)());
        } // prettier-ignore
        const operand = H.resolve(S.pop());
        const result = (0, operators_1.evaluateUnaryOp)(operator, operand);
        if (result.isSuccess) {
            return S.push(H.alloc(result.unwrap()));
        }
        return result;
    },
    BinaryOp: ({ opNodeId }, { S, H, A }) => {
        const [left, right] = H.resolveM(S.popNR(2));
        const operator = A.get(opNodeId).op;
        const result = (0, operators_1.evaluateBinaryOp)(operator, left, right);
        if (result.isSuccess) {
            return S.push(H.alloc(result.unwrap()));
        }
        return result;
    },
    CallOp: ({ calleeNodeId, arity }, { C, S, E, B, H, A }) => {
        const values = H.resolveM(S.popNR(arity));
        const op = H.resolve(S.pop());
        // handle BuiltinOp
        if (op.type === types_1.CommandType.BuiltinOp) {
            const result = B.get(op.id)(...values);
            return result instanceof runtimeSourceError_1.RuntimeSourceError ? utils_2.Result.fail(result) : S.push(H.alloc(result));
        }
        // handle ClosureOp
        const { funcDeclNodeUid, envId } = op;
        const { params, body } = A.get(funcDeclNodeUid);
        const paramNames = params.map(({ name }) => name);
        if (paramNames.length !== values.length) {
            const calleeId = A.get(calleeNodeId);
            return utils_2.Result.fail(new error_1.FuncArityError(calleeId.name, values.length, params.length, calleeId.loc));
        }
        C.pushR(...H.allocM([body, (0, types_1.RetMarker)(), { type: types_1.CommandType.EnvOp, envId: E.id() }]));
        // set the environment to the closure's environment
        E.setId(envId).extend(Object.fromEntries((0, lodash_1.zip)(paramNames, H.allocM(values))));
    },
    // TODO: should we combine it with CallOp? there is a couple of duplicated logic
    GoRoutineOp: ({ calleeNodeId, arity }, { S, E, B, H, A }, sched) => {
        const values = H.resolveM(S.popNR(arity));
        // NOTE: for now we assume it will always be a closure
        const op = H.resolve(S.pop());
        const { funcDeclNodeUid, envId } = op;
        const { params, body } = A.get(funcDeclNodeUid);
        const paramNames = params.map(({ name }) => name);
        if (paramNames.length !== values.length) {
            const calleeId = A.get(calleeNodeId);
            return utils_2.Result.fail(new error_1.FuncArityError(calleeId.name, values.length, params.length, calleeId.loc));
        }
        const _C = new utils_1.Stack();
        _C.push(H.alloc(body));
        const _S = new utils_1.Stack();
        const _E = E.copy()
            .setId(envId)
            .extend(Object.fromEntries((0, lodash_1.zip)(paramNames, H.allocM(values))));
        return void sched.spawn({ C: _C, S: _S, E: _E, B, H, A });
    },
    ChanRecvOp: (inst, { C, S, H }, _sched, routineId) => {
        const chan = H.resolve(S.peek());
        if (chan instanceof channel_1.BufferedChannel) {
            // if the channel is empty, we retry the receive operation
            if (chan.isBufferEmpty()) {
                C.push(inst);
                return utils_2.Result.ok(GoRoutineState.Blocked);
            }
            S.pop(); // pop the channel address
            return S.push(chan.recv());
        }
        if (chan instanceof channel_1.UnbufferedChannel) {
            const recvValue = chan.recv(routineId);
            // if we cannot receive, we retry the receive operation
            if (recvValue === null) {
                C.push(inst);
                return utils_2.Result.ok(GoRoutineState.Blocked);
            }
            S.pop(); // pop the channel address
            return S.push(recvValue);
        }
    },
    ChanSendOp: (inst, { C, S, H }, _sched, routineId) => {
        const [chanAddr, sendAddr] = S.peekN(2);
        const chan = H.resolve(chanAddr);
        if (chan instanceof channel_1.BufferedChannel) {
            // if the channel is full, we retry the send operation
            if (chan.isBufferFull()) {
                C.push(inst);
                return utils_2.Result.ok(GoRoutineState.Blocked);
            }
            S.popN(2); // pop the channel address and the value address
            return void chan.send(sendAddr);
        }
        if (chan instanceof channel_1.UnbufferedChannel) {
            // if we cannot send, we retry the send operation
            if (!chan.send(routineId, sendAddr)) {
                C.push(inst);
                return utils_2.Result.ok(GoRoutineState.Blocked);
            }
            return void S.popN(2); // pop the channel address and the value address
        }
        // NOTE: this should be unreachable
        return;
    },
    WaitGroupAddOp: (inst, { S, H }) => {
        const wg = H.resolve(S.peek());
        wg.add(inst.count);
        return void S.pop();
    },
    WaitGroupDoneOp: (_inst, { S, H }) => {
        const wg = H.resolve(S.peek());
        if (wg.done() < 0) {
            return utils_2.Result.fail(new error_1.InvalidOperationError('WaitGroup cannot fall below zero'));
        }
        return void S.pop();
    },
    WaitGroupWaitOp: (inst, { C, S, H }) => {
        const wg = H.resolve(S.peek());
        // if the count is not zero, we have to wait again
        if (wg.wait()) {
            C.push(inst);
            return utils_2.Result.ok(GoRoutineState.Blocked);
        }
        return void S.pop();
    },
    MutexLockOp: (_inst, { C, S, H }) => {
        const mutex = H.resolve(S.peek());
        if (mutex.isLocked()) {
            C.push(_inst);
            return utils_2.Result.ok(GoRoutineState.Blocked);
        }
        mutex.lock();
        return void S.pop();
    },
    MutexUnlockOp: (_inst, { S, H }) => {
        const mutex = H.resolve(S.peek());
        mutex.unlock();
        return void S.pop();
    },
    BranchOp: ({ cons, alt }, { S, C, H }) => void (H.resolve(S.pop()) ? C.pushR(H.alloc(cons)) : alt && C.pushR(H.alloc(alt))),
    EnvOp: ({ envId }, { E }) => void E.setId(envId),
    PopSOp: (_inst, { S }) => void S.pop(),
    PopTillMOp: ({ markers }, { C }) => {
        while (!C.isEmpty() && !(0, utils_2.isAny)(C.pop(), markers)) { }
    },
    RetMarker: () => void {},
    ForStartMarker: () => void {},
    ForPostMarker: () => void {},
    ForEndMarker: () => void {}
};
//# sourceMappingURL=goroutine.js.map