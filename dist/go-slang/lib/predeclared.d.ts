import { BuiltinOp } from '../types';
export type PredeclaredFuncT = (...args: any) => any;
export interface PredeclaredFunc {
    name: string;
    func: PredeclaredFuncT;
    op: Omit<BuiltinOp, 'id'>;
}
export declare const PREDECLARED_IDENTIFIERS: {
    [key: string]: any;
};
export declare const PREDECLARED_FUNCTIONS: PredeclaredFunc[];
