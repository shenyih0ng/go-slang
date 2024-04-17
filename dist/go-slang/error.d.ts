import { RuntimeSourceError } from '../errors/runtimeSourceError';
import { NodeLocation } from './types';
export declare class UnknownInstructionError extends RuntimeSourceError {
    private inst_type;
    constructor(inst_type: string);
    explain(): string;
    elaborate(): string;
}
export declare class InvalidOperationError extends RuntimeSourceError {
    private errorMessage;
    location: NodeLocation;
    constructor(errorMessage: string);
    explain(): string;
}
export declare class UndefinedError extends RuntimeSourceError {
    private identifier;
    location: NodeLocation;
    constructor(identifier: string, location: NodeLocation);
    explain(): string;
}
export declare class RedeclarationError extends RuntimeSourceError {
    private identifier;
    location: NodeLocation;
    constructor(identifier: string, location: NodeLocation);
    explain(): string;
}
export declare class AssignmentOperationError extends RuntimeSourceError {
    location: NodeLocation;
    constructor(location: NodeLocation);
    explain(): string;
}
export declare class FuncArityError extends RuntimeSourceError {
    private func_name;
    private n_actual;
    private n_expected;
    location: NodeLocation;
    constructor(func_name: string, n_actual: number, n_expected: number, location: NodeLocation);
    explain(): string;
}
export declare class GoExprMustBeFunctionCallError extends RuntimeSourceError {
    private expr;
    location: NodeLocation;
    constructor(expr: string, location: NodeLocation);
    explain(): string;
}
export declare class DeadLockError extends RuntimeSourceError {
    explain(): string;
}
export declare class OutOfMemoryError extends RuntimeSourceError {
    explain(): string;
}
export declare class InternalError extends RuntimeSourceError {
    private message;
    constructor(message: string);
    explain(): string;
}
