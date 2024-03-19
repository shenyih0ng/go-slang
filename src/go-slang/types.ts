import { Environment } from './lib/env'

export enum NodeType {
  SourceFile = 'SourceFile',
  Block = 'Block',
  VariableDeclaration = 'VariableDeclaration',
  FunctionDeclaration = 'FunctionDeclaration',
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

type Statement = Declaration | Block

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
  EnvOp = 'EnvOp',
  CallOp = 'CallOp'
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
}

export interface EnvOp extends Command {
  type: CommandType.EnvOp
  env: Environment
}

export type Instruction =
  | SourceFile
  | VariableDeclaration
  | FunctionDeclaration
  | Block
  | ExpressionStatement
  | Expression
  | FuncDeclOp
  | ClosureOp
  | VarDeclOp
  | AssignOp
  | UnaryOp
  | BinaryOp
  | CallOp
  | EnvOp
