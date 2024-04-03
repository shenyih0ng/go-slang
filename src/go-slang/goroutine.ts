import { zip } from 'lodash'
import { Stack } from '../cse-machine/utils'
import { RuntimeSourceError } from '../errors/runtimeSourceError'
import {
  FuncArityError,
  GoExprMustBeFunctionError,
  InvalidOperationError,
  UndefinedError,
  UnknownInstructionError
} from './error'
import { AstMap } from './lib/astMap'
import { evaluateBinaryOp } from './lib/binaryOp'
import { Environment } from './lib/env'
import { Heap, HeapAddress } from './lib/heap'
import { Result, isAny } from './lib/utils'
import {
  AssignOp,
  Assignment,
  BinaryExpression,
  BinaryOp,
  BinaryOperator,
  Block,
  BranchOp,
  BuiltinOp,
  CallExpression,
  CallOp,
  ChanRecv,
  ChanSend,
  ClosureOp,
  CommandType,
  EmptyStmt,
  EnvOp,
  ExpressionStatement,
  ForEndMarker,
  ForFormType,
  ForPostMarker,
  ForStartMarker,
  ForStatement,
  FunctionDeclaration,
  GoRoutineOp,
  GoStatement,
  Identifier,
  IfStatement,
  Instruction,
  Literal,
  NodeType,
  Operator,
  PopS,
  PopTillM,
  PopTillMOp,
  RetMarker,
  ReturnStatement,
  SendStatement,
  SourceFile,
  True,
  TypeLiteral,
  UnaryExpression,
  UnaryOp,
  VarDeclOp,
  VariableDeclaration
} from './types'
import { Scheduler } from './scheduler'
import { PredeclaredFuncT } from './lib/predeclared'
import { Channel } from './lib/channel'

export type Control = Stack<Instruction | HeapAddress>
export type Stash = Stack<HeapAddress | any>
export type Builtins = Map<number, PredeclaredFuncT>

export interface Context {
  C: Control
  S: Stash
  E: Environment
  B: Builtins
  H: Heap
  A: AstMap
}

export class GoRoutine {
  private context: Context
  private scheduler: Scheduler

  public isMain: boolean

  constructor(context: Context, scheduler: Scheduler, isMain: boolean = false) {
    this.context = context
    this.scheduler = scheduler
    this.isMain = isMain
  }

  public finished(): boolean {
    return this.context.C.isEmpty()
  }

  public tick(): Result<RuntimeSourceError> {
    const { C, H } = this.context
    const inst = H.resolve(C.pop()) as Instruction

    if (!Interpreter.hasOwnProperty(inst.type)) {
      return Result.fail(new UnknownInstructionError(inst.type))
    }

    const runtimeError = Interpreter[inst.type](inst, this.context, this.scheduler)
    return runtimeError ? Result.fail(runtimeError) : Result.ok()
  }
}

const Interpreter: {
  [key: string]: (
    inst: Instruction,
    context: Context,
    sched: Scheduler
  ) => RuntimeSourceError | void
} = {
  SourceFile: ({ topLevelDecls }: SourceFile, { C, H }) => C.pushR(...H.allocM(topLevelDecls)),

  FunctionDeclaration: (funcDeclNode: FunctionDeclaration, { E, A }) =>
    E.declare(funcDeclNode.id.name, {
      type: CommandType.ClosureOp,
      funcDeclNodeUid: A.track(funcDeclNode).uid,
      envId: E.id()
    } as ClosureOp),

  Block: ({ statements }: Block, { C, E, H }) => {
    C.pushR(...H.allocM([...statements, { type: CommandType.EnvOp, envId: E.id() }]))
    E.extend({})
  },

  ReturnStatement: ({ expression }: ReturnStatement, { C, H }) =>
    C.pushR(H.alloc(expression), H.alloc(PopTillM(RetMarker))),

  IfStatement: ({ stmt, cond, cons, alt }: IfStatement, { C, H }) => {
    const branchOp: BranchOp = { type: CommandType.BranchOp, cons, alt }
    stmt ? C.pushR(...H.allocM([stmt, cond, branchOp])) : C.pushR(...H.allocM([cond, branchOp]))
  },

  ForStatement: (inst: ForStatement, { C, H }) => {
    const { form, block: forBlock } = inst
    if (form === null || form.type === ForFormType.ForCondition) {
      const branch = { type: CommandType.BranchOp, cons: forBlock, alt: PopTillM(ForEndMarker) }
      C.pushR(
        ...H.allocM([
          form ? form.expression : True,
          branch as BranchOp,
          ForStartMarker,
          inst,
          ForEndMarker
        ])
      )
    } else if (form.type === ForFormType.ForClause) {
      const { init, cond, post } = form
      const forCond = {
        type: NodeType.ForStatement,
        form: { type: ForFormType.ForCondition, expression: cond ?? True },
        block: {
          type: NodeType.Block,
          statements: [
            { ...forBlock, statements: forBlock.statements.concat(ForPostMarker) },
            post ?? EmptyStmt
          ]
        }
      } as ForStatement
      C.push(H.alloc({ type: NodeType.Block, statements: [init ?? EmptyStmt, forCond] }))
    }
  },

  BreakStatement: (_inst, { C, H }) => C.push(H.alloc(PopTillM(ForEndMarker))),

  ContinueStatement: (_inst, { C, H }) => C.push(H.alloc(PopTillM(ForPostMarker, ForStartMarker))),

  VariableDeclaration: ({ left, right }: VariableDeclaration, { C, H, A }) => {
    const decls = A.trackM(left).map(({ uid }) => ({ type: CommandType.VarDeclOp, idNodeUid: uid }))
    return right.length === 0
      ? // if there is no right side, we push zero value for each declaration
        C.pushR(...H.allocM(decls.map(decl => ({ ...decl, zeroValue: true }))))
      : // assume: left.length === right.length
        C.pushR(...H.allocM(right), ...H.allocM(decls.reverse()))
  },

  Assignment: ({ left, right }: Assignment, { C, H, A }) => {
    const ids = left as Identifier[] // assume: left is always an array of identifiers
    const asgmts = ids.map(id => ({ type: CommandType.AssignOp, idNodeUid: A.track(id).uid }))
    C.pushR(...H.allocM(right), ...H.allocM(asgmts.reverse()))
  },

  GoStatement: ({ call, loc }: GoStatement, { C, H, A }) => {
    if (call.type !== NodeType.CallExpression) {
      return new GoExprMustBeFunctionError(call.type, loc!)
    }

    const { callee, args } = call as CallExpression
    return C.pushR(
      ...H.allocM([
        callee,
        ...args,
        {
          type: CommandType.GoRoutineOp,
          calleeNodeId: A.track(callee).uid as number,
          arity: args.length
        }
      ])
    )
  },

  SendStatement: ({ channel, value }: SendStatement, { C, H }) =>
    C.pushR(...H.allocM([value, channel, ChanSend])),

  EmptyStatement: () => void {},

  Literal: (inst: Literal, { S, H }) => S.push(H.alloc(inst.value)),

  TypeLiteral: (inst: TypeLiteral, { S }) => S.push(inst),

  Identifier: ({ name, loc }: Identifier, { S, E, H }) => {
    const value = E.lookup(name)
    return value === null ? new UndefinedError(name, loc!) : S.push(H.alloc(value))
  },

  UnaryExpression: ({ argument, operator: op }: UnaryExpression, { C, H, A }) =>
    C.pushR(...H.allocM([argument, { type: CommandType.UnaryOp, opNodeId: A.track(op).uid }])),

  BinaryExpression: ({ left, right, operator: op }: BinaryExpression, { C, H, A }) =>
    C.pushR(...H.allocM([left, right, { type: CommandType.BinaryOp, opNodeId: A.track(op).uid }])),

  CallExpression: ({ callee, args }: CallExpression, { C, H, A }) =>
    C.pushR(
      ...H.allocM([
        callee,
        ...args,
        { type: CommandType.CallOp, calleeNodeId: A.track(callee).uid, arity: args.length }
      ])
    ),

  ExpressionStatement: ({ expression }: ExpressionStatement, { C, H }) =>
    C.pushR(...H.allocM([expression, PopS])),

  VarDeclOp: ({ idNodeUid, zeroValue }: VarDeclOp, { S, E, H, A }) => {
    const name = A.get<Identifier>(idNodeUid).name
    zeroValue ? E.declareZeroValue(name) : E.declare(name, H.resolve(S.pop()))
  },

  AssignOp: ({ idNodeUid }: AssignOp, { S, E, H, A }) => {
    const id = A.get<Identifier>(idNodeUid)
    !E.assign(id.name, H.resolve(S.pop())) ? new UndefinedError(id.name, id.loc!) : void {}
  },

  UnaryOp: ({ opNodeId }: UnaryOp, { C, S, H, A }) => {
    const operator = A.get<Operator>(opNodeId).op

    if (operator === '<-') { return C.push(ChanRecv) } // prettier-ignore

    const operand = H.resolve(S.pop())
    return S.push(H.alloc(operator === '-' ? -operand : operand))
  },

  BinaryOp: ({ opNodeId }: BinaryOp, { S, H, A }) => {
    const [left, right] = H.resolveM(S.popNR(2))
    S.push(H.alloc(evaluateBinaryOp(A.get<Operator>(opNodeId).op as BinaryOperator, left, right)))
  },

  CallOp: ({ calleeNodeId, arity }: CallOp, { C, S, E, B, H, A }) => {
    const values = H.resolveM(S.popNR(arity))
    const op = H.resolve(S.pop()) as ClosureOp | BuiltinOp

    // handle BuiltinOp
    if (op.type === CommandType.BuiltinOp) {
      const result = B.get(op.id)!(...values)
      return result instanceof InvalidOperationError ? result : S.push(H.alloc(result))
    }

    // handle ClosureOp
    const { funcDeclNodeUid, envId } = op
    const { params, body } = A.get<FunctionDeclaration>(funcDeclNodeUid)
    const paramNames = params.map(({ name }) => name)

    if (paramNames.length !== values.length) {
      const calleeId = A.get<Identifier>(calleeNodeId)
      return new FuncArityError(calleeId.name, values.length, params.length, calleeId.loc!)
    }

    C.pushR(...H.allocM([body, RetMarker, { type: CommandType.EnvOp, envId: E.id() }]))
    // set the environment to the closure's environment
    E.setId(envId).extend(Object.fromEntries(zip(paramNames, values)))
  },

  // TODO: should we combine it with CallOp? there is a couple of duplicated logic
  GoRoutineOp: ({ calleeNodeId, arity }: GoRoutineOp, { S, E, B, H, A }, sched) => {
    const values = H.resolveM(S.popNR(arity))
    // NOTE: for now we assume it will always be a closure
    const op = H.resolve(S.pop()) as ClosureOp

    const { funcDeclNodeUid, envId } = op
    const { params, body } = A.get<FunctionDeclaration>(funcDeclNodeUid)
    const paramNames = params.map(({ name }) => name)

    if (paramNames.length !== values.length) {
      const calleeId = A.get<Identifier>(calleeNodeId)
      return new FuncArityError(calleeId.name, values.length, params.length, calleeId.loc!)
    }

    const _C: Control = new Stack()
    _C.push(H.alloc(body))
    const _S: Stash = new Stack()
    const _E = E.copy()
      .setId(envId)
      .extend(Object.fromEntries(zip(paramNames, values)))

    return sched.schedule(new GoRoutine({ C: _C, S: _S, E: _E, B, H, A }, sched))
  },

  ChanRecvOp: (_inst, { C, S, H }) => {
    const chanAddr = S.pop()
    const chan = H.resolve(chanAddr) as Channel

    const chanValue = chan.recv()
    if (chanValue !== null) { return S.push(H.alloc(chanValue)) } // prettier-ignore

    // retry receiving from the channel
    S.push(chanAddr)
    C.push(ChanRecv)
  },

  ChanSendOp: (_inst, { C, S, H }) => {
    const addrs = S.popN(2)
    const [channel, value] = H.resolveM(addrs) as [Channel, any]

    if (channel.send(value)) { return } // prettier-ignore

    // retry sending to the channel
    S.pushR(...addrs)
    C.push(ChanSend)
  },

  BranchOp: ({ cons, alt }: BranchOp, { S, C, H }) =>
    void (H.resolve(S.pop()) ? C.pushR(H.alloc(cons)) : alt && C.pushR(H.alloc(alt))),

  EnvOp: ({ envId }: EnvOp, { E }) => void E.setId(envId),

  PopSOp: (_inst, { S }) => void S.pop(),

  PopTillMOp: ({ markers }: PopTillMOp, { C }) => {
    while (!C.isEmpty() && !isAny(C.pop(), markers)) {}
  },

  RetMarker: () => void {},

  ForStartMarker: () => void {},
  ForPostMarker: () => void {},
  ForEndMarker: () => void {}
}
