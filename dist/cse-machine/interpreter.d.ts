/**
 * This interpreter implements an explicit-control evaluator.
 *
 * Heavily adapted from https://github.com/source-academy/JSpike/
 * and the legacy interpreter at '../interpreter/interpreter'
 */
import * as es from 'estree';
import { IOptions } from '..';
import { Context, Result, Value } from '../types';
import { ControlItem } from './types';
import { Stack } from './utils';
/**
 * The control is a list of commands that still needs to be executed by the machine.
 * It contains syntax tree nodes or instructions.
 */
export declare class Control extends Stack<ControlItem> {
    constructor(program?: es.Program);
    push(...items: ControlItem[]): void;
    /**
     * Before pushing block statements on the control stack, we check if the block statement has any declarations.
     * If not (and its not a raw block statement), instead of pushing the entire block, just the body is pushed since the block is not adding any value.
     * @param items The items being pushed on the control.
     * @returns The same set of control items, but with block statements without declarations simplified.
     */
    private static simplifyBlocksWithoutDeclarations;
    copy(): Control;
}
/**
 * The stash is a list of values that stores intermediate results.
 */
export declare class Stash extends Stack<Value> {
    constructor();
    copy(): Stash;
}
/**
 * Function to be called when a program is to be interpreted using
 * the explicit control evaluator.
 *
 * @param program The program to evaluate.
 * @param context The context to evaluate the program in.
 * @returns The result of running the CSE machine.
 */
export declare function evaluate(program: es.Program, context: Context, options: IOptions): Value;
/**
 * Function that is called when a user wishes to resume evaluation after
 * hitting a breakpoint.
 * This should only be called after the first 'evaluate' function has been called so that
 * context.runtime.control and context.runtime.stash are defined.
 * @param context The context to continue evaluating the program in.
 * @returns The result of running the CSE machine.
 */
export declare function resumeEvaluate(context: Context): any;
/**
 * Function that returns the appropriate Promise<Result> given the output of CSE machine evaluating, depending
 * on whether the program is finished evaluating, ran into a breakpoint or ran into an error.
 * @param context The context of the program.
 * @param value The value of CSE machine evaluating the program.
 * @returns The corresponding promise.
 */
export declare function CSEResultPromise(context: Context, value: Value): Promise<Result>;
