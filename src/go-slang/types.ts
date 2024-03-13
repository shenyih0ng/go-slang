export enum NodeType {
  SourceFile = 'SourceFile',
  Block = 'Block',
  VariableDeclaration = 'VariableDeclaration',
  FunctionDeclaration = 'FunctionDeclaration',
  ExpressionStatement = 'ExpressionStatement',
  Assignment = 'Assignment',
  Literal = 'Literal',
  UnaryExpression = 'UnaryExpression',
  BinaryExpression = 'BinaryExpression'
}

type TopLevelDeclaration = Declaration | FunctionDeclaration

type Declaration = VariableDeclaration

type Statement = Declaration | Block

type Block = Statement[]

type Expression = Literal | UnaryExpression | BinaryExpression

export interface Node {
  type: NodeType
}

export interface SourceFile extends Node {
  type: NodeType.SourceFile
  topLevelDecls: TopLevelDeclaration[]
}

export interface VariableDeclaration extends Node {
  type: NodeType.VariableDeclaration
  left: string[]
  right: Expression[]
}

export interface FunctionDeclaration extends Node {
  type: NodeType.FunctionDeclaration
  name: string
  params: string[]
  body: BlockStatement
}

export interface BlockStatement extends Node {
  type: NodeType.Block
  body: Statement[]
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

export enum CommandType {
  UnaryOp = 'UnaryOp',
  BinaryOp = 'BinaryOp'
}

export interface Command {
  type: CommandType
}

export interface UnaryOp extends Command {
  type: CommandType.UnaryOp
  operator: UnaryOperator
}

export interface BinaryOp extends Command {
  type: CommandType.BinaryOp
  operator: BinaryOperator
}

export type Instruction =
  | SourceFile
  | VariableDeclaration
  | FunctionDeclaration
  | BlockStatement
  | ExpressionStatement
  | Expression
  | UnaryOp
  | BinaryOp
