import { Context as SlangContext } from '..'
import { Stack } from '../cse-machine/utils'
import { RuntimeSourceError } from '../errors/runtimeSourceError'
import { Value } from '../types'
import { FuncArityError, UndefinedError, UnknownInstructionError } from './error'
import { evaluateBinaryOp } from './lib/binaryOp'
import { Environment, createGlobalEnvironment } from './lib/env'
import { PREDECLARED_FUNCTIONS } from './lib/predeclared'
import { zip } from './lib/utils'
import {
  AssignOp,
  Assignment,
  BinaryExpression,
  BinaryOp,
  Block,
  CallExpression,
  CallOp,
  ClosureOp,
  CommandType,
  EnvOp,
  ExpressionStatement,
  FuncDeclOp,
  FunctionDeclaration,
  Identifier,
  Instruction,
  Literal,
  NodeType,
  PopS,
  SourceFile,
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

  // return the top of the stash
  return S.pop()
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

  VariableDeclaration: ({ left, right }: VariableDeclaration, { C }) => {
    if (right.length === 0) {
      // if there are no right-hand side expressions, we declare zero values
      const zvDecls = left.map(({ name }) => ({
        type: CommandType.VarDeclOp,
        name,
        zeroValue: true
      })) as Instruction[]
      C.pushR(...zvDecls)
      return
    }

    zip(left, right).forEach(([{ name }, expr]) =>
      C.pushR(expr, { type: CommandType.VarDeclOp, name, zeroValue: false })
    )
  },

  Assignment: ({ left, right }: Assignment, { C }) =>
    zip(left, right).forEach(([leftExpr, rightExpr]) => {
      if (leftExpr.type === NodeType.Identifier) {
        C.pushR(rightExpr, { type: CommandType.AssignOp, name: leftExpr.name })
      }
    }),

  Literal: (inst: Literal, { S }) => S.push(inst.value),

  Identifier: ({ name }: Identifier, { S, E }) => {
    const value = E.lookup(name)
    if (value === null) {
      return IResult.error(new UndefinedError(name))
    }
    S.push(value)
    return
  },

  UnaryExpression: ({ argument, operator }: UnaryExpression, { C }) =>
    C.pushR(argument, { type: CommandType.UnaryOp, operator }),

  UnaryOp: ({ operator }: UnaryOp, { S }) => {
    const operand = S.pop()
    S.push(operator === '-' ? -operand : operand)
  },

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

  AssignOp: ({ name }: AssignOp, { S, E }) => {
    if (!E.assign(name, S.pop())) {
      return IResult.error(new UndefinedError(name))
    }
    return
  },

  BinaryOp: ({ operator }: BinaryOp, { S }) => {
    const [left, right] = S.popNR(2)
    S.push(evaluateBinaryOp(operator, left, right))
  },

  CallOp: ({ calleeName, arity }: CallOp, { C, S, E }) => {
    const values = S.popNR(arity)
    const { params, body: callee } = S.pop() as ClosureOp

    if (params.length !== values.length) {
      return IResult.error(new FuncArityError(calleeName, values.length, params.length))
    }

    C.pushR(callee, { type: CommandType.EnvOp, env: E })
    return IResult.ok(E.extend(Object.entries(zip(params, values))))
  },

  EnvOp: ({ env }: EnvOp) => IResult.ok(env),

  PopSOp: (_inst, {S}) => { S.pop() } // prettier-ignore
}
