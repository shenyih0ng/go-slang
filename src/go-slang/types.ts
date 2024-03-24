import { Environment } from './lib/env'

export enum NodeType {
  SourceFile = 'SourceFile',
  Block = 'Block',
  VariableDeclaration = 'VariableDeclaration',
  FunctionDeclaration = 'FunctionDeclaration',
  ReturnStatement = 'ReturnStatement',
  IfStatement = 'IfStatement',
  ForStatement = 'ForStatement',
  BreakStatement = 'BreakStatement',
  ContinueStatement = 'ContinueStatement',
  ExpressionStatement = 'ExpressionStatement',
  EmptyStatement = 'EmptyStatement',
  Assignment = 'Assignment',
  UnaryExpression = 'UnaryExpression',
  BinaryExpression = 'BinaryExpression',
  Identifier = 'Identifier',
  Literal = 'Literal',
  CallExpression = 'CallExpression'
}

type TopLevelDeclaration = Declaration | FunctionDeclaration

type Declaration = VariableDeclaration

type Statement =
  | Declaration
  | ReturnStatement
  | IfStatement
  | ForStatement
  | BreakStatement
  | ContinueStatement
  | Block
  | SimpleStatement
  | EmptyStatement

type SimpleStatement = ExpressionStatement | Assignment | Declaration

type Expression = Identifier | Literal | UnaryExpression | BinaryExpression | CallExpression

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

export interface IfStatement extends Node {
  type: NodeType.IfStatement
  stmt: SimpleStatement | null
  cond: Expression
  cons: Block
  alt: IfStatement | Block | null
}

type ForForm = ForCondition | ForClause

export enum ForFormType {
  ForCondition = 'ForCondition',
  ForClause = 'ForClause'
}

export interface ForStatement extends Node {
  type: NodeType.ForStatement
  form: ForForm
  block: Block
}

export interface ForCondition {
  type: ForFormType.ForCondition
  expression: Expression
}

export interface ForClause {
  type: ForFormType.ForClause
  init: SimpleStatement | null
  cond: Expression | null
  post: SimpleStatement | null
}

export interface BreakStatement extends Node {
  type: NodeType.BreakStatement
}

export interface ContinueStatement extends Node {
  type: NodeType.ContinueStatement
}

export interface Block extends Node {
  type: NodeType.Block
  statements: (Statement | Marker)[]
}

export interface ExpressionStatement extends Node {
  type: NodeType.ExpressionStatement
  expression: Expression
}

export interface EmptyStatement extends Node {
  type: NodeType.EmptyStatement
}

export const EmptyStmt: EmptyStatement = { type: NodeType.EmptyStatement }

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

export const True: Literal = { type: NodeType.Literal, value: true }

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
  VarDeclOp = 'VarDeclOp',
  AssignOp = 'AssignOp',
  UnaryOp = 'UnaryOp',
  BinaryOp = 'BinaryOp',
  FuncDeclOp = 'FuncDeclOp',
  ClosureOp = 'Closure',
  CallOp = 'CallOp',
  BranchOp = 'BranchOp',
  EnvOp = 'EnvOp',
  PopSOp = 'PopSOp',
  PopTillMOp = 'PopTillMOp',
  BuiltinOp = 'BuiltinOp',
  ApplyBuiltinOp = 'ApplyBuiltinOp'
}

export interface Command {
  type: CommandType
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

export interface CallOp extends Command {
  type: CommandType.CallOp
  arity: number
  calleeName: string
}

export interface BranchOp extends Command {
  type: CommandType.BranchOp
  cons: Block
  // TEMP: need to rethink if adding PopTillMOp is a good idea
  alt: IfStatement | Block | PopTillMOp | null
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
  markers: Marker[]
}

export const PopTillM = (...markers: Marker[]): PopTillMOp => ({
  type: CommandType.PopTillMOp,
  markers
})

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

export enum MarkerType {
  RetMarker = 'RetMarker',
  ForStartMarker = 'ForStartMarker',
  ForPostMarker = 'ForPostMarker',
  ForEndMarker = 'ForEndMarker'
}

export interface Marker {
  type: MarkerType
}

export const RetMarker = { type: MarkerType.RetMarker }

export const ForStartMarker = { type: MarkerType.ForStartMarker }

export const ForPostMarker = { type: MarkerType.ForPostMarker }

export const ForEndMarker = { type: MarkerType.ForEndMarker }

export type Instruction =
  | SourceFile
  | VariableDeclaration
  | FunctionDeclaration
  | Block
  | ExpressionStatement
  | SimpleStatement
  | ReturnStatement
  | IfStatement
  | ForStatement
  | BreakStatement
  | ContinueStatement
  | EmptyStatement
  | Expression
  | VarDeclOp
  | AssignOp
  | UnaryOp
  | BinaryOp
  | FuncDeclOp
  | ClosureOp
  | CallOp
  | BranchOp
  | EnvOp
  | PopSOp
  | PopTillMOp
  | BuiltinOp
  | ApplyBuiltinOp
  | Marker
