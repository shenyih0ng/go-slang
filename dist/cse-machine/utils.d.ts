import * as es from 'estree';
import { Context } from '..';
import { RuntimeSourceError } from '../errors/runtimeSourceError';
import Closure from '../interpreter/closure';
import { Environment, Frame, RawBlockStatement, Value } from '../types';
import { Control } from './interpreter';
import { AssmtInstr, ControlItem, Instr } from './types';
/**
 * Stack is implemented for control and stash registers.
 */
interface IStack<T> {
    push(...items: T[]): void;
    pop(): T | undefined;
    peek(): T | undefined;
    size(): number;
    isEmpty(): boolean;
    getStack(): T[];
}
export declare class Stack<T> implements IStack<T> {
    private storage;
    constructor();
    push(...items: T[]): void;
    /**
     * Pushes items onto the stack in reverse order.
     * The first item in the argument list will be at the top of the stack.
     *
     * @param items items to be pushed onto the stack
     */
    pushR(...items: T[]): void;
    pop(): T | undefined;
    /**
     * Pops n items from the stack.
     *
     * @param n number of items to pop from the stack
     * @returns an array of the popped items
     */
    popN(n: number): (T | undefined)[];
    /**
     * Pop n items from the stack in reverse order.
     * The first item in the returned array will be the last item popped from the stack.
     *
     * @param n number of items to pop from the stack
     * @returns an array of the popped items in reverse order
     */
    popNR(n: number): (T | undefined)[];
    peek(): T | undefined;
    /**
     * Returns the top n items in the stack.
     *
     * @param n amount of items to peek from the top of the stack
     * @returns an array of the top n items in the stack
     *          the first item in the array is the top of the stack
     */
    peekN(n: number): T[] | undefined;
    size(): number;
    isEmpty(): boolean;
    getStack(): T[];
    some(predicate: (value: T) => boolean): boolean;
    setTo(otherStack: Stack<T>): void;
}
/**
 * Typeguard for Instr to distinguish between program statements and instructions.
 *
 * @param command A ControlItem
 * @returns true if the ControlItem is an instruction and false otherwise.
 */
export declare const isInstr: (command: ControlItem) => command is Instr;
/**
 * Typeguard for esNode to distinguish between program statements and instructions.
 *
 * @param command A ControlItem
 * @returns true if the ControlItem is an esNode and false if it is an instruction.
 */
export declare const isNode: (command: ControlItem) => command is es.Node;
/**
 * Typeguard for esIdentifier. To verify if an esNode is an esIdentifier.
 *
 * @param node an esNode
 * @returns true if node is an esIdentifier, false otherwise.
 */
export declare const isIdentifier: (node: es.Node) => node is es.Identifier;
/**
 * Typeguard for esReturnStatement. To verify if an esNode is an esReturnStatement.
 *
 * @param node an esNode
 * @returns true if node is an esReturnStatement, false otherwise.
 */
export declare const isReturnStatement: (node: es.Node) => node is es.ReturnStatement;
/**
 * Typeguard for esIfStatement. To verify if an esNode is an esIfStatement.
 *
 * @param node an esNode
 * @returns true if node is an esIfStatement, false otherwise.
 */
export declare const isIfStatement: (node: es.Node) => node is es.IfStatement;
/**
 * Typeguard for esBlockStatement. To verify if an esNode is a block statement.
 *
 * @param node an esNode
 * @returns true if node is an esBlockStatement, false otherwise.
 */
export declare const isBlockStatement: (node: es.Node) => node is es.BlockStatement;
/**
 * Typeguard for RawBlockStatement. To verify if an esNode is a raw block statement (i.e. passed environment creation).
 *
 * @param node an esNode
 * @returns true if node is a RawBlockStatement, false otherwise.
 */
export declare const isRawBlockStatement: (node: es.Node) => node is RawBlockStatement;
/**
 * Typeguard for esRestElement. To verify if an esNode is a block statement.
 *
 * @param node an esNode
 * @returns true if node is an esRestElement, false otherwise.
 */
export declare const isRestElement: (node: es.Node) => node is es.RestElement;
/**
 * Typeguard for AssmtInstr. To verify if an instruction is an assignment instruction.
 *
 * @param instr an instruction
 * @returns true if instr is an AssmtInstr, false otherwise.
 */
export declare const isAssmtInstr: (instr: Instr) => instr is AssmtInstr;
/**
 * A helper function for handling sequences of statements.
 * Statements must be pushed in reverse order, and each statement is separated by a pop
 * instruction so that only the result of the last statement remains on stash.
 * Value producing statements have an extra pop instruction.
 *
 * @param seq Array of statements.
 * @returns Array of commands to be pushed into control.
 */
export declare const handleSequence: (seq: es.Statement[]) => ControlItem[];
/**
 * This function is used for ConditionalExpressions and IfStatements, to create the sequence
 * of control items to be added.
 */
export declare const reduceConditional: (node: es.IfStatement | es.ConditionalExpression) => ControlItem[];
/**
 * To determine if a control item is value producing. JavaScript distinguishes value producing
 * statements and non-value producing statements.
 * Refer to https://sourceacademy.nus.edu.sg/sicpjs/4.1.2 exercise 4.8.
 *
 * @param command Control item to determine if it is value producing.
 * @returns true if it is value producing, false otherwise.
 */
export declare const valueProducing: (command: es.Node) => boolean;
/**
 * To determine if a control item changes the environment.
 * There is a change in the environment when
 *  1. pushEnvironment() is called when creating a new frame, if there are variable declarations.
 *     Called in Program, BlockStatement, and Application instructions.
 *  2. there is an assignment.
 *     Called in Assignment and Array Assignment instructions.
 *
 * @param command Control item to check against.
 * @returns true if it changes the environment, false otherwise.
 */
export declare const envChanging: (command: ControlItem) => boolean;
/**
 * To determine if the function is simple.
 * Simple functions contain a single return statement.
 *
 * @param node The function to check against.
 * @returns true if the function is simple, false otherwise.
 */
export declare const isSimpleFunction: (node: es.Function) => boolean;
/**
 * Environments
 */
export declare const currentEnvironment: (context: Context) => Environment;
export declare const createEnvironment: (closure: Closure, args: Value[], callExpression: es.CallExpression) => Environment;
export declare const popEnvironment: (context: Context) => Environment | undefined;
export declare const pushEnvironment: (context: Context, environment: Environment) => void;
export declare const createBlockEnvironment: (context: Context, name?: string, head?: Frame) => Environment;
export declare function declareIdentifier(context: Context, name: string, node: es.Node, environment: Environment, constant?: boolean): Environment;
export declare function declareFunctionsAndVariables(context: Context, node: es.BlockStatement, environment: Environment): void;
export declare function hasDeclarations(node: es.BlockStatement): boolean;
export declare function hasImportDeclarations(node: es.BlockStatement): boolean;
export declare function defineVariable(context: Context, name: string, value: Value, constant: boolean | undefined, node: es.VariableDeclaration | es.ImportDeclaration): Environment;
export declare const getVariable: (context: Context, name: string, node: es.Identifier) => any;
export declare const setVariable: (context: Context, name: string, value: any, node: es.AssignmentExpression) => undefined;
export declare const handleRuntimeError: (context: Context, error: RuntimeSourceError) => never;
export declare const checkNumberOfArguments: (context: Context, callee: Closure | Value, args: Value[], exp: es.CallExpression) => undefined;
/**
 * This function can be used to check for a stack overflow.
 * The current limit is set to be a control size of 1.0 x 10^5, if the control
 * flows beyond this limit an error is thrown.
 * This corresponds to about 10mb of space according to tests ran.
 */
export declare const checkStackOverFlow: (context: Context, control: Control) => void;
/**
 * Checks whether an `if` statement returns in every possible branch.
 * @param body The `if` statement to be checked
 * @return `true` if every branch has a return statement, else `false`.
 */
export declare const hasReturnStatementIf: (statement: es.IfStatement) => boolean;
/**
 * Checks whether a block returns in every possible branch.
 * @param body The block to be checked
 * @return `true` if every branch has a return statement, else `false`.
 */
export declare const hasReturnStatement: (block: es.BlockStatement) => boolean;
export declare const hasBreakStatementIf: (statement: es.IfStatement) => boolean;
/**
 * Checks whether a block OR any of its child blocks has a `break` statement.
 * @param body The block to be checked
 * @return `true` if there is a `break` statement, else `false`.
 */
export declare const hasBreakStatement: (block: es.BlockStatement) => boolean;
export declare const hasContinueStatementIf: (statement: es.IfStatement) => boolean;
/**
 * Checks whether a block OR any of its child blocks has a `continue` statement.
 * @param body The block to be checked
 * @return `true` if there is a `continue` statement, else `false`.
 */
export declare const hasContinueStatement: (block: es.BlockStatement) => boolean;
export {};
