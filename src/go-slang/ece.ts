import { Context as SlangContext } from '..'
import { Stack } from '../cse-machine/utils'
import { RuntimeSourceError } from '../errors/runtimeSourceError'
import { Value } from '../types'
import { FuncArityError, UndefinedError, UnknownInstructionError } from './error'
import { AstMap } from './lib/astMap'
import { evaluateBinaryOp } from './lib/binaryOp'
import { Environment } from './lib/env'
import { Heap, HeapAddress } from './lib/heap'
import { PREDECLARED_FUNCTIONS, PREDECLARED_IDENTIFIERS } from './lib/predeclared'
import { zip, isAny } from './lib/utils'
import {
  ApplyBuiltinOp,
  AssignOp,
  Assignment,
  BinaryExpression,
  BinaryOp,
  Block,
  BranchOp,
  BuiltinOp,
  CallExpression,
  CallOp,
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
  Identifier,
  IfStatement,
  Instruction,
  Literal,
  NodeType,
  PopS,
  PopTillM,
  PopTillMOp,
  RetMarker,
  ReturnStatement,
  SourceFile,
  True,
  UnaryExpression,
  UnaryOp,
  VarDeclOp,
  VariableDeclaration
} from './types'

type Control = Stack<Instruction | HeapAddress>
type Stash = Stack<HeapAddress>
type Builtins = Map<number, (...args: any[]) => any>

interface Context {
  C: Control
  S: Stash
  E: Environment
  B: Builtins
  H: Heap
  A: AstMap
}

export function evaluate(program: SourceFile, slangContext: SlangContext): Value {
  const C = new Stack<Instruction | HeapAddress>()
  const S = new Stack<any>()
  const E = new Environment({ ...PREDECLARED_IDENTIFIERS })

  // `SourceFile` is the root node of the AST which has latest (monotonically increasing) uid of all AST nodes
  // Therefore, the next uid to be used to track AST nodes is the uid of SourceFile + 1
  const A = new AstMap((program.uid as number) + 1)
  const H = new Heap(A)

  // inject predeclared functions into the global environment
  const B = new Map<number, (...args: any[]) => any>()
  PREDECLARED_FUNCTIONS.forEach(({ name, func, op }, id) => {
    E.declare(name, { ...op, id })
    if (name === 'println') {
      // println is special case where we need to the `rawDisplay` slang builtin for
      // console capture, therefore we handle it differently from other predeclared functions
      // NOTE: we assume that the `rawDisplay` builtin always exists
      B.set(id, func(slangContext.nativeStorage.builtins.get('slangRawDisplay')))
      return
    }
    B.set(id, func)
  })

  const Context = { C, S, E, B, H, A }

  // start the program by calling `main`
  const CALL_MAIN: CallExpression = {
    type: NodeType.CallExpression,
    callee: { type: NodeType.Identifier, name: 'main' },
    args: []
  }
  C.pushR(H.alloc(program), H.alloc(CALL_MAIN))

  while (!C.isEmpty()) {
    const inst = H.resolve(C.pop()) as Instruction

    if (!interpreter.hasOwnProperty(inst.type)) {
      slangContext.errors.push(new UnknownInstructionError(inst.type))
      return undefined
    }

    const runtimeError = interpreter[inst.type](inst, Context)
    if (runtimeError) {
      slangContext.errors.push(runtimeError as RuntimeSourceError)
      return undefined
    }
  }

  return 'Program exited'
}

const interpreter: {
  [key: string]: (inst: Instruction, context: Context) => RuntimeSourceError | void
} = {
  SourceFile: ({ topLevelDecls }: SourceFile, { C, H }) => C.pushR(...H.allocM(topLevelDecls)),

  FunctionDeclaration: (funcDeclNode: FunctionDeclaration, { E, A }) => {
    const { id, uid: funcDeclNodeUid } = funcDeclNode
    A.set(funcDeclNodeUid as number, funcDeclNode)
    E.declare(id.name, { type: CommandType.ClosureOp, funcDeclNodeUid, envId: E.id() } as ClosureOp)
  },

  Block: ({ statements }: Block, { C, E, H }) => {
    C.pushR(...statements, H.alloc({ type: CommandType.EnvOp, envId: E.id() }))
    E.extend({})
  },

  ReturnStatement: ({ expression }: ReturnStatement, { C }) =>
    C.pushR(expression, PopTillM(RetMarker)),

  IfStatement: ({ stmt, cond, cons, alt }: IfStatement, { C }) => {
    const branchOp: BranchOp = { type: CommandType.BranchOp, cons, alt }
    stmt ? C.pushR(stmt, cond, branchOp) : C.pushR(cond, branchOp)
  },

  ForStatement: (inst: ForStatement, { C }) => {
    const { form, block: forBlock } = inst
    if (form === null || form.type === ForFormType.ForCondition) {
      const branch = { type: CommandType.BranchOp, cons: forBlock, alt: PopTillM(ForEndMarker) }
      C.pushR(form ? form.expression : True, branch as BranchOp, ForStartMarker, inst, ForEndMarker)
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
      C.push({ type: NodeType.Block, statements: [init ?? EmptyStmt, forCond] })
    }
  },

  BreakStatement: (_inst, { C }) => C.push(PopTillM(ForEndMarker)),

  ContinueStatement: (_inst, { C }) => C.push(PopTillM(ForPostMarker, ForStartMarker)),

  VariableDeclaration: ({ left, right }: VariableDeclaration, { C }) => {
    const decls = left.map(({ name }) => ({ type: CommandType.VarDeclOp, name })) as Instruction[]
    return right.length === 0
      ? // if there is no right side, we push zero value for each declaration
        C.pushR(...decls.map(decl => ({ ...decl, zeroValue: true })))
      : // assume: left.length === right.length
        C.pushR(...right, ...decls.reverse())
  },

  Assignment: ({ left, right }: Assignment, { C }) => {
    const ids = left as Identifier[] // assume: left is always an array of identifiers
    const asgmts = ids.map(({ name }) => ({ type: CommandType.AssignOp, name })) as Instruction[]
    C.pushR(...right, ...asgmts.reverse())
  },

  EmptyStatement: () => void {},

  Literal: (inst: Literal, { S, H }) => S.push(H.alloc(inst.value)),

  Identifier: ({ name }: Identifier, { S, E, H }) => {
    const value = E.lookup(name)
    return value === null ? new UndefinedError(name) : S.push(H.alloc(value))
  },

  UnaryExpression: ({ argument, operator }: UnaryExpression, { C }) =>
    C.pushR(argument, { type: CommandType.UnaryOp, operator }),

  BinaryExpression: ({ left, right, operator }: BinaryExpression, { C }) =>
    C.pushR(left, right, { type: CommandType.BinaryOp, operator: operator }),

  CallExpression: ({ callee, args }: CallExpression, { C, H, A }) =>
    C.pushR(
      H.alloc(callee),
      ...H.allocM(args),
      H.alloc({ type: CommandType.CallOp, calleeNodeId: A.track(callee).uid, arity: args.length })
    ),

  ExpressionStatement: ({ expression }: ExpressionStatement, { C }) => C.pushR(expression, PopS),

  VarDeclOp: ({ name, zeroValue }: VarDeclOp, { S, E, H }) =>
    zeroValue ? E.declareZeroValue(name) : E.declare(name, H.resolve(S.pop())),

  AssignOp: ({ name }: AssignOp, { S, E, H }) =>
    !E.assign(name, H.resolve(S.pop())) ? new UndefinedError(name) : void {},

  UnaryOp: ({ operator }: UnaryOp, { S, H }) => {
    const operand = H.resolve(S.pop())
    S.push(H.alloc(operator === '-' ? -operand : operand))
  },

  BinaryOp: ({ operator }: BinaryOp, { S, H }) => {
    const [left, right] = H.resolveM(S.popNR(2))
    S.push(H.alloc(evaluateBinaryOp(operator, left, right)))
  },

  CallOp: ({ calleeNodeId, arity }: CallOp, { C, S, E, H, A }) => {
    const values = H.resolveM(S.popNR(arity))
    const op = H.resolve(S.pop()) as ClosureOp | BuiltinOp

    if (op.type === CommandType.BuiltinOp) {
      return C.pushR({ type: CommandType.ApplyBuiltinOp, builtinOp: op, values })
    }

    // handle ClosureOp
    const { funcDeclNodeUid, envId } = op
    const { params, body } = A.get(funcDeclNodeUid) as FunctionDeclaration
    const paramNames = params.map(({ name }) => name)

    if (paramNames.length !== values.length) {
      const calleeId = A.get(calleeNodeId) as Identifier
      return new FuncArityError(calleeId.name, values.length, params.length)
    }

    C.pushR(body, RetMarker, H.alloc({ type: CommandType.EnvOp, envId: E.id() }))
    // set the environment to the closure's environment
    E.setId(envId).extend(Object.fromEntries(zip(paramNames, values)))
  },

  BranchOp: ({ cons, alt }: BranchOp, { S, C, H }) =>
    void (H.resolve(S.pop()) ? C.pushR(cons) : alt && C.pushR(alt)),

  ApplyBuiltinOp: ({ builtinOp: { id }, values }: ApplyBuiltinOp, { S, B, H }) =>
    void S.push(H.alloc(B.get(id)!(...values))),

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
