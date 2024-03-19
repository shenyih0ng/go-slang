import { Context } from '..'
import { Stack } from '../cse-machine/utils'
import { RuntimeSourceError } from '../errors/runtimeSourceError'
import { Value } from '../types'
import { FuncArityError, UndefinedError, UnknownInstructionError } from './error'
import { evaluateBinaryOp } from './lib/binaryOp'
import { Environment, createGlobalEnvironment } from './lib/env'
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
  SourceFile,
  UnaryExpression,
  UnaryOp,
  VarDeclOp,
  VariableDeclaration
} from './types'

type Control = Stack<Instruction>
type Stash = Stack<any>

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

export function evaluate(program: SourceFile, context: Context): Value {
  const C = new Stack<Instruction>()
  const S = new Stack<any>()
  let E = createGlobalEnvironment()

  // start the program by calling `main`
  C.pushR(program, CALL_MAIN)

  while (!C.isEmpty()) {
    const inst = C.pop() as Instruction

    if (!interpreter.hasOwnProperty(inst.type)) {
      context.errors.push(new UnknownInstructionError(inst.type))
      return undefined
    }

    const result = interpreter[inst.type](inst, C, S, E) ?? IResult.ok(E)
    if (!result.ok) {
      context.errors.push(result.error as RuntimeSourceError)
      return undefined
    }
    E = result.value as Environment
  }

  // return the top of the stash
  return S.pop()
}

const interpreter: {
  [key: string]: (
    inst: Instruction,
    C: Control,
    S: Stash,
    E: Environment
  ) => IResult<Environment, RuntimeSourceError> | void
} = {
  SourceFile: ({ topLevelDecls }: SourceFile, C, _S, _E) => C.pushR(...topLevelDecls),

  FunctionDeclaration: ({ name: id, params, body }: FunctionDeclaration, C, _S, _E) =>
    C.push({
      type: CommandType.FuncDeclOp,
      name: id.name,
      params: params.map(id => id.name),
      body: body
    }),

  Block: ({ statements }: Block, C, _S, E) => {
    C.pushR(...statements, { type: CommandType.EnvOp, env: E })
    return IResult.ok(E.extend({}))
  },

  VariableDeclaration: ({ left, right }: VariableDeclaration, C, _S, _E) => {
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

  Assignment: ({ left, right }: Assignment, C, _S, _E) =>
    zip(left, right).forEach(([leftExpr, rightExpr]) => {
      if (leftExpr.type === NodeType.Identifier) {
        C.pushR(rightExpr, { type: CommandType.AssignOp, name: leftExpr.name })
      }
    }),

  Literal: (inst: Literal, _C, S, _E) => S.push(inst.value),

  Identifier: ({ name }: Identifier, _C, S, E) => {
    const value = E.lookup(name)
    if (value === null) {
      return IResult.error(new UndefinedError(name))
    }
    S.push(value)
    return
  },

  UnaryExpression: ({ argument, operator }: UnaryExpression, C, _S, _E) =>
    C.pushR(argument, { type: CommandType.UnaryOp, operator }),

  UnaryOp: ({ operator }: UnaryOp, _C, S, _E) => {
    const operand = S.pop()
    S.push(operator === '-' ? -operand : operand)
  },

  BinaryExpression: ({ left, right, operator }: BinaryExpression, C, _S, _E) =>
    C.pushR(left, right, { type: CommandType.BinaryOp, operator: operator }),

  CallExpression: ({ callee, args }: CallExpression, C, _S, _E) =>
    C.pushR(callee, ...args, {
      type: CommandType.CallOp,
      calleeName: callee.name,
      arity: args.length
    }),

  ExpressionStatement: ({ expression }: ExpressionStatement, C, _S, _E) =>
    C.pushR(expression, { type: CommandType.PopSOp }),

  FuncDeclOp: ({ name, params, body }: FuncDeclOp, _C, _S, E) =>
    E.declare(name, { type: CommandType.ClosureOp, params, body, env: E }),

  VarDeclOp: ({ name, zeroValue }: VarDeclOp, _C, S, E) =>
    zeroValue ? E.declareZeroValue(name) : E.declare(name, S.pop()),

  AssignOp: ({ name }: AssignOp, _C, S, E) => {
    if (!E.assign(name, S.pop())) {
      return IResult.error(new UndefinedError(name))
    }
    return
  },

  BinaryOp: ({ operator }: BinaryOp, _C, S, _E) => {
    const [left, right] = S.popNR(2)
    S.push(evaluateBinaryOp(operator, left, right))
  },

  CallOp: ({ calleeName, arity }: CallOp, C, S, E) => {
    const values = S.popNR(arity)
    const { params, body: callee } = S.pop() as ClosureOp

    if (params.length !== values.length) {
      return IResult.error(new FuncArityError(calleeName, values.length, params.length))
    }

    C.pushR(callee, { type: CommandType.EnvOp, env: E })
    return IResult.ok(E.extend(Object.entries(zip(params, values))))
  },

  EnvOp: ({ env }: EnvOp, _C, _S, _E) => IResult.ok(env),

  PopSOp: (_inst, _C, S, _E) => { S.pop() } // prettier-ignore
}
