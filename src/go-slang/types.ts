import { Environment } from './lib/env'

export enum NodeType {
  SourceFile = 'SourceFile',
  Block = 'Block',
  VariableDeclaration = 'VariableDeclaration',
  FunctionDeclaration = 'FunctionDeclaration',
  ReturnStatement = 'ReturnStatement',
  ExpressionStatement = 'ExpressionStatement',
  Assignment = 'Assignment',
  UnaryExpression = 'UnaryExpression',
  BinaryExpression = 'BinaryExpression',
  Identifier = 'Identifier',
  Literal = 'Literal',
  CallExpression = 'CallExpression'
}

type TopLevelDeclaration = Declaration | FunctionDeclaration

type Declaration = VariableDeclaration

type Statement = Declaration | ReturnStatement | Block

type Expression =
  | Identifier
  | Literal
  | UnaryExpression
  | BinaryExpression
  | Assignment
  | CallExpression

export interface Node {
  type: NodeType
}

export interface SourceFile extends Node {
  type: NodeType.SourceFile
  topLevelDecls: TopLevelDeclaration[]
}

export interface VariableDeclaration extends Node {
  type: NodeType.VariableDeclaration
  left: Identifier[]
  right: Expression[]
}

export interface FunctionDeclaration extends Node {
  type: NodeType.FunctionDeclaration
  name: Identifier
  params: Identifier[]
  body: Block
}

export interface ReturnStatement extends Node {
  type: NodeType.ReturnStatement
  expression: Expression
}

export interface Block extends Node {
  type: NodeType.Block
  statements: Statement[]
}

export interface ExpressionStatement extends Node {
  type: NodeType.ExpressionStatement
  expression: Expression
}

export interface Assignment extends Node {
  type: NodeType.Assignment
  left: Expression[]
  right: Expression[]
}

export interface Identifier extends Node {
  type: NodeType.Identifier
  name: string
}

export interface Literal extends Node {
  type: NodeType.Literal
  value: any
}

export type UnaryOperator = '+' | '-'

export interface UnaryExpression extends Node {
  type: NodeType.UnaryExpression
  operator: UnaryOperator
  argument: Expression
}

export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '|'
  | '^'
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='

export interface BinaryExpression extends Node {
  type: NodeType.BinaryExpression
  operator: BinaryOperator
  left: Expression
  right: Expression
}

export interface CallExpression extends Node {
  type: NodeType.CallExpression
  callee: Identifier
  args: Expression[]
}

export enum CommandType {
  FuncDeclOp = 'FuncDeclOp',
  ClosureOp = 'Closure',
  VarDeclOp = 'VarDeclOp',
  AssignOp = 'AssignOp',
  UnaryOp = 'UnaryOp',
  BinaryOp = 'BinaryOp',
  CallOp = 'CallOp',
  EnvOp = 'EnvOp',
  PopSOp = 'PopSOp',
  PopTillMOp = 'PopTillMOp',
  BuiltinOp = 'BuiltinOp',
  ApplyBuiltinOp = 'ApplyBuiltinOp'
}

export interface Command {
  type: CommandType
}

export interface FuncDeclOp extends Command {
  type: CommandType.FuncDeclOp
  name: string
  params: string[]
  body: Block
}

export interface ClosureOp extends Command {
  type: CommandType.ClosureOp
  name: string
  params: string[]
  body: Block
  env: Environment
}

export interface BuiltinOp extends Command {
  type: CommandType.BuiltinOp
  id: number
  arity?: number
}

export interface ApplyBuiltinOp extends Command {
  type: CommandType.ApplyBuiltinOp
  builtinOp: BuiltinOp
  values: any[]
}

export interface VarDeclOp extends Command {
  type: CommandType.VarDeclOp
  zeroValue: boolean
  name: string
}

export interface AssignOp extends Command {
  type: CommandType.AssignOp
  name: string
}

export interface UnaryOp extends Command {
  type: CommandType.UnaryOp
  operator: UnaryOperator
}

export interface BinaryOp extends Command {
  type: CommandType.BinaryOp
  operator: BinaryOperator
}

export interface CallOp extends Command {
  type: CommandType.CallOp
  arity: number
  calleeName: string
}

export interface EnvOp extends Command {
  type: CommandType.EnvOp
  env: Environment
}

export interface PopSOp extends Command {
  type: CommandType.PopSOp
}

export const PopS: PopSOp = { type: CommandType.PopSOp }

export interface PopTillMOp extends Command {
  type: CommandType.PopTillMOp
  marker: Marker
}

export enum MarkerType {
  RetMarker = 'RetMarker'
}

export interface Marker {
  type: MarkerType
}

export const RetMarker = { type: MarkerType.RetMarker }

export type Instruction =
  | SourceFile
  | VariableDeclaration
  | FunctionDeclaration
  | Block
  | ExpressionStatement
  | ReturnStatement
  | Expression
  | FuncDeclOp
  | ClosureOp
  | BuiltinOp
  | ApplyBuiltinOp
  | VarDeclOp
  | AssignOp
  | UnaryOp
  | BinaryOp
  | CallOp
  | EnvOp
  | PopSOp
  | PopTillMOp
  | Marker
