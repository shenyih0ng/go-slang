export declare class Mutex {
    protected memory: DataView;
    protected LOCKED_OFFSET: number;
    toString(): string;
    constructor(memory: DataView);
    protected getisLocked(): boolean;
    protected setisLocked(value: boolean): void;
    isLocked(): boolean;
    lock(): void;
    unlock(): void;
}
