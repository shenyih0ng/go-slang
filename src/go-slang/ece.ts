import { Context as SlangContext } from '..'
import { Stack } from '../cse-machine/utils'
import { RuntimeSourceError } from '../errors/runtimeSourceError'
import { Value } from '../types'
import { FuncArityError, UndefinedError, UnknownInstructionError } from './error'
import { evaluateBinaryOp } from './lib/binaryOp'
import { Environment, createGlobalEnvironment } from './lib/env'
import { PREDECLARED_FUNCTIONS } from './lib/predeclared'
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
  FuncDeclOp,
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

type Control = Stack<Instruction>
type Stash = Stack<any>
type Builtins = Map<number, (...args: any[]) => any>

interface Context {
  C: Control
  S: Stash
  E: Environment
  B: Builtins
}

// IResult is a type that represents the result of an interpreter operation
class IResult<T, E extends RuntimeSourceError> {
  private constructor(
    public readonly ok: boolean,
    public readonly value?: T,
    public readonly error?: E
  ) {}

  public static ok<T, E extends RuntimeSourceError>(value: T): IResult<T, E> {
    return new IResult(true, value)
  }

  public static error<_T, E extends RuntimeSourceError>(error: E): IResult<any, E> {
    return new IResult(false, undefined, error)
  }
}

const CALL_MAIN: CallExpression = {
  type: NodeType.CallExpression,
  callee: { type: NodeType.Identifier, name: 'main' },
  args: []
}

export function evaluate(program: SourceFile, slangContext: SlangContext): Value {
  const C = new Stack<Instruction>()
  const S = new Stack<any>()
  const E = createGlobalEnvironment()

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

  const Context = { C, S, E, B }

  // start the program by calling `main`
  C.pushR(program, CALL_MAIN)

  while (!C.isEmpty()) {
    const inst = C.pop() as Instruction

    if (!interpreter.hasOwnProperty(inst.type)) {
      slangContext.errors.push(new UnknownInstructionError(inst.type))
      return undefined
    }

    const result = interpreter[inst.type](inst, Context) ?? IResult.ok(Context.E)
    if (!result.ok) {
      slangContext.errors.push(result.error as RuntimeSourceError)
      return undefined
    }
    Context.E = result.value as Environment
  }

  return 'Program exited'
}

const interpreter: {
  [key: string]: (
    inst: Instruction,
    context: Context
  ) => IResult<Environment, RuntimeSourceError> | void
} = {
  SourceFile: ({ topLevelDecls }: SourceFile, { C }) => C.pushR(...topLevelDecls),

  FunctionDeclaration: ({ name: id, params, body }: FunctionDeclaration, { C }) =>
    C.push({
      type: CommandType.FuncDeclOp,
      name: id.name,
      params: params.map(id => id.name),
      body: body
    }),

  Block: ({ statements }: Block, { C, E }) => {
    C.pushR(...statements, { type: CommandType.EnvOp, env: E })
    return IResult.ok(E.extend({}))
  },

  ReturnStatement: ({ expression }: ReturnStatement, { C }) =>
    C.pushR(expression, PopTillM(RetMarker)),

  IfStatement: ({ stmt, cond, cons, alt }: IfStatement, { C }) => {
    const branchOp: BranchOp = { type: CommandType.BranchOp, cons, alt }
    stmt ? C.pushR(stmt, cond, branchOp) : C.pushR(cond, branchOp)
  },

  ForStatement: (inst: ForStatement, { C }) => {
    const { form, block } = inst
    if (form === null || form.type === ForFormType.ForCondition) {
      const branch = { type: CommandType.BranchOp, cons: block, alt: PopTillM(ForEndMarker) }
      C.pushR(form ? form.expression : True, branch as BranchOp, ForStartMarker, inst, ForEndMarker)
    } else if (form.type === ForFormType.ForClause) {
      const { init, cond, post } = form
      C.push({
        type: NodeType.Block,
        statements: [
          init ?? EmptyStmt,
          {
            type: NodeType.ForStatement,
            form: { type: ForFormType.ForCondition, expression: cond ?? True },
            block: {
              type: NodeType.Block,
              statements: [
                { ...block, statements: block.statements.concat(ForPostMarker) },
                post ?? EmptyStmt
              ]
            }
          }
        ]
      })
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

  Literal: (inst: Literal, { S }) => S.push(inst.value),

  Identifier: ({ name }: Identifier, { S, E }) => {
    const value = E.lookup(name)
    return value === null ? IResult.error(new UndefinedError(name)) : S.push(value)
  },

  UnaryExpression: ({ argument, operator }: UnaryExpression, { C }) =>
    C.pushR(argument, { type: CommandType.UnaryOp, operator }),

  BinaryExpression: ({ left, right, operator }: BinaryExpression, { C }) =>
    C.pushR(left, right, { type: CommandType.BinaryOp, operator: operator }),

  CallExpression: ({ callee, args }: CallExpression, { C }) =>
    C.pushR(callee, ...args, {
      type: CommandType.CallOp,
      calleeName: callee.name,
      arity: args.length
    }),

  ExpressionStatement: ({ expression }: ExpressionStatement, { C }) => C.pushR(expression, PopS),

  FuncDeclOp: ({ name, params, body }: FuncDeclOp, { E }) =>
    E.declare(name, { type: CommandType.ClosureOp, params, body, env: E }),

  VarDeclOp: ({ name, zeroValue }: VarDeclOp, { S, E }) =>
    zeroValue ? E.declareZeroValue(name) : E.declare(name, S.pop()),

  AssignOp: ({ name }: AssignOp, { S, E }) =>
    !E.assign(name, S.pop()) ? IResult.error(new UndefinedError(name)) : void {},

  UnaryOp: ({ operator }: UnaryOp, { S }) => {
    const operand = S.pop()
    S.push(operator === '-' ? -operand : operand)
  },

  BinaryOp: ({ operator }: BinaryOp, { S }) => {
    const [left, right] = S.popNR(2)
    S.push(evaluateBinaryOp(operator, left, right))
  },

  CallOp: ({ calleeName, arity }: CallOp, { C, S, E }) => {
    const values = S.popNR(arity)
    const op = S.pop() as ClosureOp | BuiltinOp

    if (op.type === CommandType.BuiltinOp) {
      C.pushR({ type: CommandType.ApplyBuiltinOp, builtinOp: op, values })
      return
    }

    // handle ClosureOp
    const { params, body: callee } = op
    if (params.length !== values.length) {
      return IResult.error(new FuncArityError(calleeName, values.length, params.length))
    }

    C.pushR(callee, RetMarker, { type: CommandType.EnvOp, env: E })
    return IResult.ok(E.extend(Object.fromEntries(zip(params, values))))
  },

  BranchOp: ({ cons, alt }: BranchOp, { S, C }) =>
    void (S.pop() ? C.pushR(cons) : alt && C.pushR(alt)),

  ApplyBuiltinOp: ({ builtinOp: { id }, values }: ApplyBuiltinOp, { B }) =>
    void B.get(id)!(...values),

  EnvOp: ({ env }: EnvOp) => IResult.ok(env),

  PopSOp: (_inst, { S }) => void S.pop(),

  PopTillMOp: ({ markers }: PopTillMOp, { C }) => {
    while (!C.isEmpty() && !isAny(C.pop(), markers)) {}
  },

  RetMarker: () => void {},

  ForStartMarker: () => void {},
  ForPostMarker: () => void {},
  ForEndMarker: () => void {}
}
