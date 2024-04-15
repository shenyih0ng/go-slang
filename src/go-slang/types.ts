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
  GoStatement = 'GoStatement',
  SendStatement = 'SendStatement',
  EmptyStatement = 'EmptyStatement',
  Assignment = 'Assignment',
  Operator = 'Operator',
  UnaryExpression = 'UnaryExpression',
  BinaryExpression = 'BinaryExpression',
  Identifier = 'Identifier',
  QualifiedIdentifier = 'QualifiedIdentifier',
  Literal = 'Literal',
  FunctionLiteral = 'FunctionLiteral',
  TypeLiteral = 'TypeLiteral',
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
  | GoStatement
  | EmptyStatement

type SimpleStatement = ExpressionStatement | Assignment | Declaration

type Expression =
  | Identifier
  | QualifiedIdentifier
  | Literal
  | FunctionLiteral
  | UnaryExpression
  | BinaryExpression
  | CallExpression

interface Position {
  line: number
  column: number
  offset: number
}
export interface NodeLocation {
  start: Position
  end: Position
  offset: number
}

export interface Node {
  type: NodeType
  uid?: number
  loc?: NodeLocation
}

export function isNode(v: any): boolean {
  return v && v.type && NodeType[v.type]
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
  id: Identifier
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

export interface GoStatement extends Node {
  type: NodeType.GoStatement
  call: CallExpression
}

export interface SendStatement extends Node {
  type: NodeType.SendStatement
  channel: Expression
  value: Expression
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
  op: Operator | null
  right: Expression[]
}

export interface Identifier extends Node {
  type: NodeType.Identifier
  name: string
}

export interface QualifiedIdentifier extends Node {
  type: NodeType.QualifiedIdentifier
  pkg: Identifier
  method: Identifier
}

export interface Literal extends Node {
  type: NodeType.Literal
  value: any
}

export const True: Literal = { type: NodeType.Literal, value: true }

export interface FunctionLiteral extends Node {
  type: NodeType.FunctionLiteral
  params: Identifier[]
  body: Block
}

export enum NewType {
  WaitGroup = 'sync.WaitGroup'
}

export enum MakeType {
  Channel = 'chan'
}

export interface TypeLiteral extends Node {
  type: NodeType.TypeLiteral
  value: NewType | MakeType
}

export function isTypeLiteral(v: any): v is TypeLiteral {
  return v && v.type === NodeType.TypeLiteral
}

export type UnaryOperator = '+' | '-' | '!' | '^' | '<-'

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
  | '<<'
  | '>>'
  | '&'
  | '&^'
  | '&&'
  | '||'

export interface Operator extends Node {
  type: NodeType.Operator
  op: UnaryOperator | BinaryOperator
}

export interface UnaryExpression extends Node {
  type: NodeType.UnaryExpression
  operator: Operator
  argument: Expression
}

export interface BinaryExpression extends Node {
  type: NodeType.BinaryExpression
  operator: Operator
  left: Expression
  right: Expression
}

export interface CallExpression extends Node {
  type: NodeType.CallExpression
  callee: QualifiedIdentifier | Identifier | FunctionLiteral
  args: Expression[]
}

export enum CommandType {
  VarDeclOp = 'VarDeclOp',
  AssignOp = 'AssignOp',
  UnaryOp = 'UnaryOp',
  BinaryOp = 'BinaryOp',
  ClosureOp = 'ClosureOp',
  CallOp = 'CallOp',
  GoRoutineOp = 'GoRoutineOp',
  ChanRecvOp = 'ChanRecvOp',
  ChanSendOp = 'ChanSendOp',
  WaitGroupAddOp = 'WaitGroupAddOp',
  WaitGroupDoneOp = 'WaitGroupDoneOp',
  WaitGroupWaitOp = 'WaitGroupWaitOp',
  BranchOp = 'BranchOp',
  EnvOp = 'EnvOp',
  PopSOp = 'PopSOp',
  PopTillMOp = 'PopTillMOp',
  BuiltinOp = 'BuiltinOp'
}

export interface Command {
  type: CommandType
}

export function isCommand(v: any): boolean {
  return v && v.type && CommandType[v.type]
}

export interface VarDeclOp extends Command {
  type: CommandType.VarDeclOp
  zeroValue: boolean
  idNodeUid: number
}

export interface AssignOp extends Command {
  type: CommandType.AssignOp
  idNodeUid: number
}

export interface UnaryOp extends Command {
  type: CommandType.UnaryOp
  opNodeId: number
}

export interface BinaryOp extends Command {
  type: CommandType.BinaryOp
  opNodeId: number
}

export interface ClosureOp extends Command {
  type: CommandType.ClosureOp
  funcDeclNodeUid: number
  envId: number
}

export interface CallOp extends Command {
  type: CommandType.CallOp
  arity: number
  calleeNodeId: number
}

export interface GoRoutineOp extends Command {
  type: CommandType.GoRoutineOp
  arity: number
  calleeNodeId: number
}

export interface ChanRecvOp extends Command {
  type: CommandType.ChanRecvOp
}

export const ChanRecv = () => ({ type: CommandType.ChanRecvOp }) as ChanRecvOp

export interface ChanSendOp extends Command {
  type: CommandType.ChanSendOp
}

export const ChanSend = () => ({ type: CommandType.ChanSendOp }) as ChanSendOp

export interface WaitGroupAddOp extends Command {
  type: CommandType.WaitGroupAddOp
  count: number
}

export const WaitGroupAdd = () => ({ type: CommandType.WaitGroupAddOp }) as WaitGroupAddOp

export interface WaitGroupDoneOp extends Command {
  type: CommandType.WaitGroupDoneOp
}

export const WaitGroupDone = () => ({ type: CommandType.WaitGroupDoneOp }) as WaitGroupDoneOp
export interface WaitGroupWaitOp extends Command {
  type: CommandType.WaitGroupWaitOp
}

export const WaitGroupWait = () => ({ type: CommandType.WaitGroupWaitOp }) as WaitGroupWaitOp

export interface BranchOp extends Command {
  type: CommandType.BranchOp
  cons: Block
  // TEMP: need to rethink if adding PopTillMOp is a good idea
  alt: IfStatement | Block | PopTillMOp | null
}

export interface EnvOp extends Command {
  type: CommandType.EnvOp
  envId: number
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

export enum MarkerType {
  RetMarker = 'RetMarker',
  ForStartMarker = 'ForStartMarker',
  ForPostMarker = 'ForPostMarker',
  ForEndMarker = 'ForEndMarker'
}

export interface Marker {
  type: MarkerType
}

export const RetMarker = () => ({ type: MarkerType.RetMarker })

export const ForStartMarker = () => ({ type: MarkerType.ForStartMarker })

export const ForPostMarker = () => ({ type: MarkerType.ForPostMarker })

export const ForEndMarker = () => ({ type: MarkerType.ForEndMarker })

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
  | GoStatement
  | SendStatement
  | BreakStatement
  | ContinueStatement
  | EmptyStatement
  | Expression
  | TypeLiteral
  | VarDeclOp
  | AssignOp
  | UnaryOp
  | BinaryOp
  | ClosureOp
  | CallOp
  | GoRoutineOp
  | ChanRecvOp
  | ChanSendOp
  | WaitGroupAddOp
  | WaitGroupDoneOp
  | WaitGroupWaitOp
  | BranchOp
  | EnvOp
  | PopSOp
  | PopTillMOp
  | BuiltinOp
  | Marker

export interface Make {
  type: MakeType
}

export function isMake(v: any): boolean {
  return v && v.type && Object.values(MakeType).includes(v.type)
}

export interface MakeChannel extends Make {
  type: MakeType.Channel
  size: number
}

export interface New {
  type: NewType
}

export function isNew(v: any): boolean {
  return v && v.type && Object.values(NewType).includes(v.type)
}

export interface NewWaitGroup extends New {
  type: NewType.WaitGroup
  count: number
}
