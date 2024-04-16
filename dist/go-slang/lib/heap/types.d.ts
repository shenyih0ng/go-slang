export declare class HeapObject {
    protected memory: DataView;
    constructor(memory: DataView);
    protected get addr(): number;
    isEqual(other: HeapObject): boolean;
}
