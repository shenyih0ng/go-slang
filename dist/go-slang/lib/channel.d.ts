export declare class Channel {
    protected memory: DataView;
    constructor(memory: DataView);
    protected get maxBufSize(): number;
    protected getSlotAddr(slotIdx: number): number;
    protected getSlotValue(slotIdx: number): number;
    protected setSlotValue(slotIdx: number, value: number): void;
    addr(): number;
}
export declare class UnbufferedChannel extends Channel {
    static RECV_ID_OFFSET: number;
    static SEND_ID_OFFSET: number;
    static SYNCED_OFFSET: number;
    static NULL_ID: number;
    constructor(memory: DataView);
    send(routineId: number, value: any): boolean;
    recv(routineId: number): number | null;
    toString(): string;
    private hasSender;
    private hasReceiver;
    private get recvId();
    private set recvId(value);
    private get sendId();
    private set sendId(value);
    private get synced();
    private set synced(value);
    private reset;
}
export declare class BufferedChannel extends Channel {
    static READ_IDX_OFFSET: number;
    static WRITE_IDX_OFFSET: number;
    static BUF_SIZE_OFFSET: number;
    constructor(memory: DataView);
    send(value: any): boolean;
    recv(): number | null;
    toString(): string;
    isBufferFull(): boolean;
    isBufferEmpty(): boolean;
    private get readIdx();
    private set readIdx(value);
    private get writeIdx();
    private set writeIdx(value);
    private get bufSize();
    private set bufSize(value);
}
