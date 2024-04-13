import { RuntimeSourceError } from '../../errors/runtimeSourceError';
import { BinaryOperator, UnaryOperator } from '../types';
import { Result } from './utils';
export declare function evaluateUnaryOp(operator: Omit<UnaryOperator, '<-'>, value: any): Result<any, RuntimeSourceError>;
export declare function evaluateBinaryOp(operator: BinaryOperator, left: any, right: any): Result<any, RuntimeSourceError>;
