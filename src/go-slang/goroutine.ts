import { zip } from 'lodash'
import { Stack } from '../cse-machine/utils'
import { RuntimeSourceError } from '../errors/runtimeSourceError'
import {
  AssignmentOperationError,
  FuncArityError,
  GoExprMustBeFunctionCallError,
  InvalidOperationError,
  UndefinedError,
  UnknownInstructionError
} from './error'
import { AstMap } from './lib/astMap'
import { evaluateBinaryOp, evaluateUnaryOp } from './lib/operators'
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
  ChanRecvOp,
  ChanSend,
  ChanSendOp,
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
  FunctionLiteral,
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
  UnaryOperator,
  VarDeclOp,
  VariableDeclaration,
  WaitGroupAddOp,
  WaitGroupDoneOp,
  WaitGroupWaitOp
} from './types'
import { Scheduler } from './scheduler'
import { PredeclaredFuncT } from './lib/predeclared'
import { BufferedChannel, UnbufferedChannel } from './lib/channel'
import { WaitGroup } from './lib/waitgroup'

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

export enum GoRoutineState {
  Running,
  Blocked,
  Exited
}

export class GoRoutine {
  private id: number
  private context: Context
  private scheduler: Scheduler

  // used to determine if the goroutine made progress in the last tick
  public progress: boolean = false
  private prevInst: Instruction | null = null

  public state: GoRoutineState
  public isMain: boolean

  constructor(id: number, context: Context, scheduler: Scheduler, isMain: boolean = false) {
    this.id = id
    this.state = GoRoutineState.Running
    this.context = context
    this.scheduler = scheduler
    this.isMain = isMain
  }

  public activeHeapAddresses(): Set<HeapAddress> {
    const activeAddrSet = new Set<HeapAddress>()

    // roots: Control, Stash, Environment
    const { C, S, E } = this.context

    const isHeapAddr = (addr: any): addr is HeapAddress => typeof addr === 'number'
    C.getStack().filter(isHeapAddr).forEach(addr => activeAddrSet.add(addr)) // prettier-ignore
    S.getStack().filter(isHeapAddr).forEach(addr => activeAddrSet.add(addr)) // prettier-ignore

    return new Set([...activeAddrSet, ...E.activeHeapAddresses()])
  }

  public tick(): Result<GoRoutineState, RuntimeSourceError> {
    const { C, H } = this.context
    const inst = H.resolve(C.pop()) as Instruction

    if (!Interpreter.hasOwnProperty(inst.type)) {
      this.state = GoRoutineState.Exited
      return Result.fail(new UnknownInstructionError(inst.type))
    }

    try {
      const nextState =
        Interpreter[inst.type](inst, this.context, this.scheduler, this.id) ??
        Result.ok(C.isEmpty() ? GoRoutineState.Exited : GoRoutineState.Running)

      this.state = nextState.isSuccess ? nextState.unwrap() : GoRoutineState.Exited
      this.progress = this.prevInst !== inst
      this.prevInst = inst

      return nextState
    } catch (error) {
      this.state = GoRoutineState.Exited
      return Result.fail(error)
    }
  }
}

const Interpreter: {
  [key: string]: (
    inst: Instruction,
    context: Context,
    sched: Scheduler,
    routineId: number
  ) => Result<GoRoutineState, RuntimeSourceError> | void
} = {
  SourceFile: ({ topLevelDecls }: SourceFile, { C, H }) => C.pushR(...H.allocM(topLevelDecls)),

  FunctionDeclaration: (funcDeclNode: FunctionDeclaration, { E, H, A }) =>
    E.declare(
      funcDeclNode.id.name,
      H.alloc({
        type: CommandType.ClosureOp,
        funcDeclNodeUid: A.track(funcDeclNode).uid,
        envId: E.id()
      } as ClosureOp)
    ),

  Block: ({ statements }: Block, { C, E, H }) => {
    C.pushR(...H.allocM([...statements, { type: CommandType.EnvOp, envId: E.id() }]))
    E.extend({})
  },

  ReturnStatement: ({ expression }: ReturnStatement, { C, H }) =>
    C.pushR(H.alloc(expression), H.alloc(PopTillM(RetMarker()))),

  IfStatement: ({ stmt, cond, cons, alt }: IfStatement, { C, H }) => {
    const branchOp: BranchOp = { type: CommandType.BranchOp, cons, alt }
    stmt ? C.pushR(...H.allocM([stmt, cond, branchOp])) : C.pushR(...H.allocM([cond, branchOp]))
  },

  ForStatement: (inst: ForStatement, { C, H }) => {
    const { form, block: forBlock } = inst
    if (form === null || form.type === ForFormType.ForCondition) {
      const branch = { type: CommandType.BranchOp, cons: forBlock, alt: PopTillM(ForEndMarker()) }
      C.pushR(
        ...H.allocM([
          form ? form.expression : True,
          branch as BranchOp,
          ForStartMarker(),
          inst,
          ForEndMarker()
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
            { ...forBlock, statements: forBlock.statements.concat(ForPostMarker()) },
            post ?? EmptyStmt
          ]
        }
      } as ForStatement
      C.push(H.alloc({ type: NodeType.Block, statements: [init ?? EmptyStmt, forCond] }))
    }
  },

  BreakStatement: (_inst, { C, H }) => C.push(H.alloc(PopTillM(ForEndMarker()))),

  ContinueStatement: (_inst, { C, H }) =>
    C.push(H.alloc(PopTillM(ForPostMarker(), ForStartMarker()))),

  VariableDeclaration: ({ left, right }: VariableDeclaration, { C, H, A }) => {
    const decls = A.trackM(left).map(({ uid }) => ({ type: CommandType.VarDeclOp, idNodeUid: uid }))
    return right.length === 0
      ? // if there is no right side, we push zero value for each declaration
        C.pushR(...H.allocM(decls.map(decl => ({ ...decl, zeroValue: true }))))
      : // assume: left.length === right.length
        C.pushR(...H.allocM(right), ...H.allocM(decls.reverse()))
  },

  Assignment: ({ left, op, right }: Assignment, { C, H, A }) => {
    const ids = left as Identifier[] // assume: left is always an array of identifiers
    const asgmts = ids.map(id => ({ type: CommandType.AssignOp, idNodeUid: A.track(id).uid }))
    const asgmts_alloc = H.allocM(asgmts.reverse())
    // assignment
    if (!op) {
      return C.pushR(...H.allocM(right), ...asgmts_alloc)
    }

    // assignment operation
    if (left.length !== 1 || right.length !== 1) {
      return Result.fail(new AssignmentOperationError(op.loc!))
    }
    C.pushR(
      ...H.allocM(
        zip(left, right)
          .map(([l, r]) => [l, r, { type: CommandType.BinaryOp, opNodeId: A.track(op).uid }])
          .flat()
      ),
      ...asgmts_alloc
    )
  },

  GoStatement: ({ call, loc }: GoStatement, { C, H, A }) => {
    if (call.type !== NodeType.CallExpression) {
      return Result.fail(new GoExprMustBeFunctionCallError(call.type, loc!))
    }

    const { callee, args } = call as CallExpression
    return void C.pushR(
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
    C.pushR(...H.allocM([value, channel, ChanSend()])),

  EmptyStatement: () => void {},

  Literal: (inst: Literal, { S, H }) => S.push(H.alloc(inst.value)),

  FunctionLiteral: (funcLitNode: FunctionLiteral, { S, E, H }) =>
    S.push(
      H.alloc({
        type: CommandType.ClosureOp,
        funcDeclNodeUid: funcLitNode.uid,
        envId: E.id()
      } as ClosureOp)
    ),

  TypeLiteral: (inst: TypeLiteral, { S }) => S.push(inst),

  Identifier: ({ name, loc }: Identifier, { S, E, H }) => {
    const value = E.lookup(name)
    return value === null ? Result.fail(new UndefinedError(name, loc!)) : S.push(value)
  },

  UnaryExpression: ({ argument, operator: op }: UnaryExpression, { C, H, A }) =>
    C.pushR(...H.allocM([argument, { type: CommandType.UnaryOp, opNodeId: A.track(op).uid }])),

  BinaryExpression: ({ left, right, operator: op }: BinaryExpression, { C, H, A }) =>
    C.pushR(...H.allocM([left, right, { type: CommandType.BinaryOp, opNodeId: A.track(op).uid }])),

  CallExpression: ({ callee, args }: CallExpression, { C, E, S, H, A }) => {
    if (callee.type !== NodeType.QualifiedIdentifier) {
      C.pushR(
        ...H.allocM([
          callee,
          ...args,
          { type: CommandType.CallOp, calleeNodeId: A.track(callee).uid, arity: args.length }
        ])
      )
      return
    }

    const className = H.resolve(E.lookup(callee.pkg.name))
    if (className === null) {
      return Result.fail(new UndefinedError(callee.pkg.name, callee.loc!))
    }

    if (className instanceof WaitGroup) {
      const methodActions = {
        Add: () => ({ type: CommandType.WaitGroupAddOp, count: (args[0] as Literal).value }),
        Done: () => ({ type: CommandType.WaitGroupDoneOp }),
        Wait: () => ({ type: CommandType.WaitGroupWaitOp })
      }

      const action = methodActions[callee.method.name]()
      if (!action) {
        return Result.fail(new UndefinedError(callee.method.name, callee.method.loc!))
      }

      const waitGroupHeapAddress = E.lookup(callee.pkg.name)
      S.push(waitGroupHeapAddress)
      return C.push(action)
    }

    // Should be unreachable
    return Result.fail(new UndefinedError(callee.method.name, callee.method.loc!))
  },

  ExpressionStatement: ({ expression }: ExpressionStatement, { C, H }) =>
    C.pushR(...H.allocM([expression, PopS])),

  VarDeclOp: ({ idNodeUid, zeroValue }: VarDeclOp, { S, E, H, A }) => {
    const name = A.get<Identifier>(idNodeUid).name
    zeroValue ? E.declareZeroValue(name) : E.declare(name, S.pop())
  },

  AssignOp: ({ idNodeUid }: AssignOp, { S, E, H, A }) => {
    const id = A.get<Identifier>(idNodeUid)
    !E.assign(id.name, S.pop()) ? new UndefinedError(id.name, id.loc!) : void {}
  },

  UnaryOp: ({ opNodeId }: UnaryOp, { C, S, H, A }) => {
    const operator = A.get<Operator>(opNodeId).op as UnaryOperator

    if (operator === '<-') { return C.push(ChanRecv()) } // prettier-ignore

    const operand = H.resolve(S.pop())
    const result = evaluateUnaryOp(operator, operand)
    if (result.isSuccess) {
      return S.push(H.alloc(result.unwrap()))
    }
    return result
  },

  BinaryOp: ({ opNodeId }: BinaryOp, { S, H, A }) => {
    const [left, right] = H.resolveM(S.popNR(2))

    const operator = A.get<Operator>(opNodeId).op as BinaryOperator
    const result = evaluateBinaryOp(operator, left, right)
    if (result.isSuccess) {
      return S.push(H.alloc(result.unwrap()))
    }
    return result
  },

  CallOp: ({ calleeNodeId, arity }: CallOp, { C, S, E, B, H, A }) => {
    const values = H.resolveM(S.popNR(arity))
    const op = H.resolve(S.pop()) as ClosureOp | BuiltinOp

    // handle BuiltinOp
    if (op.type === CommandType.BuiltinOp) {
      const result = B.get(op.id)!(...values)
      return result instanceof RuntimeSourceError ? Result.fail(result) : S.push(H.alloc(result))
    }

    // handle ClosureOp
    const { funcDeclNodeUid, envId } = op
    const { params, body } = A.get<FunctionDeclaration>(funcDeclNodeUid)
    const paramNames = params.map(({ name }) => name)

    if (paramNames.length !== values.length) {
      const calleeId = A.get<Identifier>(calleeNodeId)
      return Result.fail(
        new FuncArityError(calleeId.name, values.length, params.length, calleeId.loc!)
      )
    }

    C.pushR(...H.allocM([body, RetMarker(), { type: CommandType.EnvOp, envId: E.id() }]))
    // set the environment to the closure's environment
    E.setId(envId).extend(Object.fromEntries(zip(paramNames, H.allocM(values))))
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
      return Result.fail(
        new FuncArityError(calleeId.name, values.length, params.length, calleeId.loc!)
      )
    }

    const _C: Control = new Stack()
    _C.push(H.alloc(body))
    const _S: Stash = new Stack()
    const _E = E.copy()
      .setId(envId)
      .extend(Object.fromEntries(zip(paramNames, H.allocM(values))))

    return void sched.spawn({ C: _C, S: _S, E: _E, B, H, A } as Context)
  },

  ChanRecvOp: (inst: ChanRecvOp, { C, S, H }, _sched, routineId: number) => {
    const chan = H.resolve(S.peek()) as BufferedChannel | UnbufferedChannel

    if (chan instanceof BufferedChannel) {
      // if the channel is empty, we retry the receive operation
      if (chan.isBufferEmpty()) {
        C.push(inst)
        return Result.ok(GoRoutineState.Blocked)
      }
      S.pop() // pop the channel address
      return S.push(H.alloc(chan.recv()))
    }

    if (chan instanceof UnbufferedChannel) {
      const recvValue = chan.recv(routineId)
      // if we cannot receive, we retry the receive operation
      if (recvValue === null) {
        C.push(inst)
        return Result.ok(GoRoutineState.Blocked)
      }
      S.pop() // pop the channel address
      return S.push(H.alloc(recvValue))
    }
  },

  ChanSendOp: (inst: ChanSendOp, { C, S, H }, _sched, routineId: number) => {
    const [chan, sendValue] = H.resolveM(S.peekN(2)!) as [BufferedChannel | UnbufferedChannel, any]

    if (chan instanceof BufferedChannel) {
      // if the channel is full, we retry the send operation
      if (chan.isBufferFull()) {
        C.push(inst)
        return Result.ok(GoRoutineState.Blocked)
      }
      S.popN(2) // pop the channel address and the value address
      return void chan.send(sendValue)
    }

    if (chan instanceof UnbufferedChannel) {
      // if we cannot send, we retry the send operation
      if (!chan.send(routineId, sendValue)) {
        C.push(inst)
        return Result.ok(GoRoutineState.Blocked)
      }
      return void S.popN(2) // pop the channel address and the value address
    }

    // NOTE: this should be unreachable
    return
  },

  WaitGroupAddOp: (inst: WaitGroupAddOp, { S, H }) => {
    const wg = H.resolve(S.peek()) as WaitGroup
    wg.add(inst.count)
    return void S.pop()
  },

  WaitGroupDoneOp: (_inst: WaitGroupDoneOp, { S, H }) => {
    const wg = H.resolve(S.peek()) as WaitGroup
    if (wg.done() < 0) {
      return Result.fail(new InvalidOperationError('WaitGroup cannot fall below zero'))
    }
    return void S.pop()
  },

  WaitGroupWaitOp: (inst: WaitGroupWaitOp, { C, S, H }) => {
    const wg = H.resolve(S.peek()) as WaitGroup
    // if the count is not zero, we have to wait again
    if (wg.wait()) {
      C.push(inst)
      return Result.ok(GoRoutineState.Blocked)
    }
    return void S.pop()
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
