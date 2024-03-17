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
  CommandType,
  ExpressionStatement,
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
    interpreter[inst.type](inst, C, S, E)
  }

  // return the top of the stash
  return S.pop()
}

const interpreter: {
  [key: string]: (inst: Instruction, C: Control, S: Stash, E: Environment) => void
} = {
  SourceFile: (inst: SourceFile, C, _S, _E) =>
    inst.topLevelDecls.reverse().forEach(decl => C.push(decl)),

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

  ExpressionStatement: (inst: ExpressionStatement, C, _S, _E) => C.push(inst.expression),

  VarDeclOp: (inst: VarDeclOp, _C, S, E) =>
    inst.zeroValue ? E.declareZeroValue(inst.name) : E.declare(inst.name, S.pop()),

  BinaryOp: (inst: BinaryOp, _C, S, _E) => {
    const right = S.pop()
    const left = S.pop()
    S.push(evaluateBinaryOp(inst.operator, left, right))
  }
}
