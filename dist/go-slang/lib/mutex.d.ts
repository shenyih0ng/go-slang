import { HeapObject } from './heap/types';
export declare class Mutex extends HeapObject {
    protected LOCKED_OFFSET: number;
    toString(): string;
    constructor(memory: DataView);
    protected getisLocked(): boolean;
    protected setisLocked(value: boolean): void;
    isLocked(): boolean;
    lock(): void;
    unlock(): void;
}
