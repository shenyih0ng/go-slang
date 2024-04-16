import { HeapObject } from './heap/types';
export declare class WaitGroup extends HeapObject {
    protected COUNT_OFFSET: number;
    toString(): string;
    constructor(memory: DataView);
    protected getCount(): number;
    protected setCount(value: number): number;
    add(n: number): void;
    done(): number;
    wait(): boolean;
}
