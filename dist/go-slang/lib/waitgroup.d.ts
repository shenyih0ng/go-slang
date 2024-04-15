export declare class WaitGroup {
    protected memory: DataView;
    protected COUNT_OFFSET: number;
    toString(): string;
    constructor(memory: DataView);
    protected getCount(): number;
    protected setCount(value: number): number;
    add(n: number): void;
    done(): number;
    wait(): boolean;
}
