import { SourceError } from '../../types';
export declare function zip<T1, T2>(first: Array<T1>, second: Array<T2>): Array<[T1, T2]>;
/**
 * Check if a given (query) value is in a list of values.
 *
 * @param query
 * @param values
 * @returns true if the query value is in the list of values, false otherwise.
 */
export declare function isAny<T1, T2>(query: T1, values: T2[]): boolean;
export declare class Result<T, E extends SourceError> {
    private value;
    isSuccess: boolean;
    isFailure: boolean;
    error: E | undefined;
    private constructor();
    unwrap(): T;
    static ok<T, E extends SourceError>(value?: T): Result<T, E>;
    static fail<T, E extends SourceError>(error: E): Result<T, E>;
}
export declare class Counter {
    private count;
    constructor(start?: number);
    next(): number;
}
export declare function benchmark(label: string): (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
