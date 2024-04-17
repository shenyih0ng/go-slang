import { HeapAddress } from './heap';
type Maybe<T> = T | null;
export declare class Environment {
    private frameMap;
    private frameIdCounter;
    private currFrame;
    constructor(bindings?: {
        [key: string]: any;
    });
    private newFrame;
    id(): number;
    setId(id: number): Environment;
    declare(name: string, value: any): void;
    declareZeroValue(name: string): void;
    assign(name: string, value: any): boolean;
    lookup(name: string): Maybe<any>;
    extend(bindings: {
        [key: string]: any;
    }): Environment;
    declaredInBlock(name: string): boolean;
    copy(): Environment;
    activeHeapAddresses(): Set<HeapAddress>;
}
export {};
