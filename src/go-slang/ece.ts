import { Context } from '..'
import { Stack } from '../cse-machine/utils'
import { Value } from '../types'
import { UnknownInstructionError } from './error'
import { evaluateBinaryOp } from './lib/binaryOp'
import { Environment, createGlobalEnvironment } from './lib/env'
import { zip } from './lib/utils'
import {
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
  SourceFile,
  UnaryExpression,
  UnaryOp,
  VarDeclOp,
  VariableDeclaration
} from './types'

type Control = Stack<Instruction>
type Stash = Stack<any>

export function evaluate(program: SourceFile, context: Context): Value {
  const C = new Stack<Instruction>()
  const S = new Stack<any>()
  let E = createGlobalEnvironment()

  // push the program onto the control stack
  C.push(program)

  while (!C.isEmpty()) {
    const inst = C.pop() as Instruction

    if (!interpreter.hasOwnProperty(inst.type)) {
      context.errors.push(new UnknownInstructionError(inst.type))
      return undefined
    }

    E = interpreter[inst.type](inst, C, S, E) ?? E
  }

  // return the top of the stash
  return S.pop()
}

const interpreter: {
  [key: string]: (inst: Instruction, C: Control, S: Stash, E: Environment) => void | Environment
} = {
  SourceFile: (inst: SourceFile, C, _S, _E) =>
    inst.topLevelDecls.reverse().forEach(decl => C.push(decl)),

  FunctionDeclaration: ({ name: id, params, body }: FunctionDeclaration, C, _S, _E) =>
    C.push({
      type: CommandType.FuncDeclOp,
      name: id.name,
      params: params.map(id => id.name),
      body: body
    }),

  Block: ({ statements }: Block, C, _S, E) => {
    C.pushR(...statements, { type: CommandType.EnvOp, env: E })
    return E.extend({})
  },

  VariableDeclaration: (inst: VariableDeclaration, C, _S, _E) => {
    const ids = inst.left.reverse() // reverse the identifiers to preserve order in Control stack
    const exprs = inst.right.reverse() // reverse the expressions to preserve order in Control stack

    if (inst.right.length === 0) {
      // if there are no right-hand side expressions, we declare zero values
      ids.forEach(id => C.push({ type: CommandType.VarDeclOp, name: id.name, zeroValue: true }))
      return
    }

    zip(ids, exprs).forEach(([{ name }, expr]) => {
      C.push({ type: CommandType.VarDeclOp, name, zeroValue: false })
      C.push(expr)
    })
  },

  Literal: (inst: Literal, _C, S, _E) => S.push(inst.value),

  Identifier: (inst: Identifier, _C, S, E) => S.push(E.lookup(inst.name)),

  UnaryExpression: (inst: UnaryExpression, C, _S, _E) => {
    C.push({ type: CommandType.UnaryOp, operator: inst.operator })
    C.push(inst.argument)
  },

  UnaryOp: (inst: UnaryOp, _C, S, _E) => {
    const operand = S.pop()
    S.push(inst.operator === '-' ? -operand : operand)
  },

  BinaryExpression: (inst: BinaryExpression, C, _S, _E) => {
    C.push({ type: CommandType.BinaryOp, operator: inst.operator })
    C.push(inst.right)
    C.push(inst.left)
  },

  CallExpression: ({ callee, args }: CallExpression, C, _S, _E) =>
    C.pushR(callee, ...args, { type: CommandType.CallOp, arity: args.length }),

  ExpressionStatement: (inst: ExpressionStatement, C, _S, _E) => C.push(inst.expression),

  FuncDeclOp: (inst: FuncDeclOp, _C, _S, E) =>
    E.declare(inst.name, {
      type: CommandType.ClosureOp,
      params: inst.params,
      body: inst.body,
      env: E
    }),

  VarDeclOp: (inst: VarDeclOp, _C, S, E) =>
    inst.zeroValue ? E.declareZeroValue(inst.name) : E.declare(inst.name, S.pop()),

  BinaryOp: (inst: BinaryOp, _C, S, _E) => {
    const right = S.pop()
    const left = S.pop()
    S.push(evaluateBinaryOp(inst.operator, left, right))
  },

  CallOp: (inst: CallOp, C, S, E) => {
    const values = S.popNR(inst.arity)
    const { params, body: callee } = S.pop() as ClosureOp

    C.pushR(callee, { type: CommandType.EnvOp, env: E })

    // NOTE: we assume that params.length === values.length
    return E.extend(Object.entries(zip(params, values)))
  },

  EnvOp: ({ env }: EnvOp, _C, _S, E) => (E = env)
}
