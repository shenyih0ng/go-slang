import { Parser } from '../types';
export declare class GoParser implements Parser<any> {
    parse(programStr: string, context: any, options?: any, throwOnError?: boolean): any;
    validate(ast: any, context: any, throwOnError?: boolean): boolean;
}
