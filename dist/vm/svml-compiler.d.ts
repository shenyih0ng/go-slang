import * as es from 'estree';
import { Context } from '../types';
export type Offset = number;
export type Address = [
    number,
    number?
];
export type Instruction = [
    number,
    Argument?,
    Argument?
];
export type Argument = number | boolean | string | Offset | Address;
export type SVMFunction = [
    number,
    number,
    number,
    Instruction[]
];
export type Program = [
    number,
    SVMFunction[]
];
export declare function compileForConcurrent(program: es.Program, context: Context): Program;
export declare function compilePreludeToIns(program: es.Program): Program;
export declare function compileToIns(program: es.Program, prelude?: Program, vmInternalFunctions?: string[]): Program;
