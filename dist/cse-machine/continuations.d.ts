import * as es from 'estree';
import { Environment } from '../types';
import { Control, Stash } from './interpreter';
/**
 * A dummy function used to detect for the call/cc function object.
 * If the interpreter sees this specific function, a continuation at the current
 * point of evaluation is executed instead of a regular function call.
 */
export declare function call_with_current_continuation(f: any): any;
/**
 * Checks if the function refers to the designated function object call/cc.
 */
export declare function isCallWithCurrentContinuation(f: Function): boolean;
/**
 * An object representing a continuation of the ECE machine.
 * When instantiated, it copies the control stack, and
 * current environment at the point of capture.
 *
 * Continuations and functions are treated as the same by
 * the typechecker so that they can be first-class values.
 */
export interface Continuation extends Function {
    control: Control;
    stash: Stash;
    env: Environment[];
}
export declare function getContinuationControl(cn: Continuation): Control;
export declare function getContinuationStash(cn: Continuation): Stash;
export declare function getContinuationEnv(cn: Continuation): Environment[];
export declare function makeContinuation(control: Control, stash: Stash, env: Environment[]): Function;
/**
 * Checks whether a given function is actually a continuation.
 */
export declare function isContinuation(f: Function): f is Continuation;
/**
 * Provides an adequate representation of what calling
 * call/cc or continuations looks like, to give to the
 * GENERATE_CONT and RESUME_CONT instructions.
 */
export declare function makeDummyContCallExpression(callee: string, argument: string): es.CallExpression;
