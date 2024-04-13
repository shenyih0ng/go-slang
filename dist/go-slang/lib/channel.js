"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BufferedChannel = exports.UnbufferedChannel = exports.Channel = void 0;
const config_1 = require("./heap/config");
/* prettier-ignore */
class Channel {
    constructor(memory) { this.memory = memory; }
    get maxBufSize() { return this.memory.getUint16(5); }
    getSlotAddr(slotIdx) { return (slotIdx + 1) * config_1.WORD_SIZE; }
    getSlotValue(slotIdx) { return this.memory.getFloat64(this.getSlotAddr(slotIdx)); }
    setSlotValue(slotIdx, value) { this.memory.setFloat64(this.getSlotAddr(slotIdx), value); }
    addr() { return this.memory.byteOffset; }
}
exports.Channel = Channel;
class UnbufferedChannel extends Channel {
    constructor(memory) { super(memory); } // prettier-ignore
    send(routineId, value) {
        const isSender = this.sendId === routineId;
        if (isSender) {
            if (this.synced) {
                // there is a receiver that has already taken the value
                // that the current routine was trying to send previously
                // therefore, the current routine can continue
                // reset the channel state
                this.reset();
                return true;
            }
            else {
                // the value hasn't been taken by a receiver
                // so the routine needs to continue waiting
                return false;
            }
        }
        if (this.hasSender() || this.synced) {
            // if there is another sender or another sync is happening, the current routine
            // cannot send the value and needs to wait
            return false;
        }
        // there is no sender and no sync happening
        // the current routine can try to send the value
        this.setSlotValue(0, value); // set the value to be sent
        this.sendId = routineId; // claim the channel as the sender
        if (this.hasReceiver()) {
            // if there is a receiver waiting, the current routine can proceed to start
            // the sync process
            this.synced = true;
            return true;
        }
        else {
            // no receiver waiting, the current routine needs to wait
            // we hand the responsibility of syncing to the receiver
            return false;
        }
    }
    recv(routineId) {
        const isReciever = this.recvId === routineId;
        if (isReciever) {
            if (this.synced) {
                // there is a value to be recieved by the current routine
                // that was trying to recieve previously
                // therefore, the current routine can continue
                // extract the value from the channel and reset the channel state
                const value = this.getSlotValue(0);
                this.reset();
                return value;
            }
            else {
                // there is no value to be recieved so the routine needs to continue waiting
                return null;
            }
        }
        if (this.hasReceiver() || this.synced) {
            // if there is another reciever or another sync is happening, the current routine
            // cannot try to recieve a value and needs to wait
            return null;
        }
        // there is no reciever and no sync happening
        // the current routine can try to recieve a value
        if (this.hasSender()) {
            // if there is a sender waiting, the current routine can proceed to start
            // the recieve the value and start the sync process
            this.synced = true;
            return this.getSlotValue(0);
        }
        else {
            // no sender waiting, the current routine needs to wait
            // we hand the responsibility of syncing to the sender
            return null;
        }
    }
    toString() {
        return `UnbufferedChan(addr=0x${this.addr().toString(16)})`;
    }
    hasSender() { return this.sendId !== UnbufferedChannel.NULL_ID; } // prettier-ignore
    hasReceiver() { return this.recvId !== UnbufferedChannel.NULL_ID; } // prettier-ignore
    get recvId() {
        return this.memory.getInt16(UnbufferedChannel.RECV_ID_OFFSET);
    }
    set recvId(newRecvId) {
        this.memory.setInt16(UnbufferedChannel.RECV_ID_OFFSET, newRecvId);
    }
    get sendId() {
        return this.memory.getInt16(UnbufferedChannel.SEND_ID_OFFSET);
    }
    set sendId(newSendId) {
        this.memory.setInt16(UnbufferedChannel.SEND_ID_OFFSET, newSendId);
    }
    get synced() {
        return this.memory.getUint8(UnbufferedChannel.SYNCED_OFFSET) === 1;
    }
    set synced(hasSynced) {
        this.memory.setUint8(UnbufferedChannel.SYNCED_OFFSET, hasSynced ? 1 : 0);
    }
    reset() {
        this.sendId = UnbufferedChannel.NULL_ID;
        this.recvId = UnbufferedChannel.NULL_ID;
        this.synced = false;
    }
}
exports.UnbufferedChannel = UnbufferedChannel;
UnbufferedChannel.RECV_ID_OFFSET = 1;
UnbufferedChannel.SEND_ID_OFFSET = 3;
UnbufferedChannel.SYNCED_OFFSET = 7;
UnbufferedChannel.NULL_ID = -1;
class BufferedChannel extends Channel {
    constructor(memory) { super(memory); } // prettier-ignore
    send(value) {
        if (this.isBufferFull()) {
            return false;
        } // prettier-ignore
        // enqueue
        this.setSlotValue(this.writeIdx++ % this.maxBufSize, value);
        this.bufSize++;
        return true;
    }
    recv() {
        if (this.isBufferEmpty()) {
            return null;
        } // prettier-ignore
        // dequeue
        const value = this.getSlotValue(this.readIdx++ % this.maxBufSize);
        this.bufSize--;
        return value;
    }
    toString() {
        return `BufferedChan(addr=0x${this.addr().toString(16)})`;
    }
    isBufferFull() {
        return this.bufSize === this.maxBufSize;
    }
    isBufferEmpty() {
        return this.bufSize === 0;
    }
    get readIdx() {
        return this.memory.getUint8(BufferedChannel.READ_IDX_OFFSET);
    }
    set readIdx(newReadIdx) {
        this.memory.setUint8(BufferedChannel.READ_IDX_OFFSET, newReadIdx);
    }
    get writeIdx() {
        return this.memory.getUint8(BufferedChannel.WRITE_IDX_OFFSET);
    }
    set writeIdx(newWriteIdx) {
        this.memory.setUint8(BufferedChannel.WRITE_IDX_OFFSET, newWriteIdx);
    }
    get bufSize() {
        return this.memory.getUint8(BufferedChannel.BUF_SIZE_OFFSET);
    }
    set bufSize(newBufSize) {
        this.memory.setUint8(BufferedChannel.BUF_SIZE_OFFSET, newBufSize);
    }
}
exports.BufferedChannel = BufferedChannel;
BufferedChannel.READ_IDX_OFFSET = 1;
BufferedChannel.WRITE_IDX_OFFSET = 2;
BufferedChannel.BUF_SIZE_OFFSET = 3;
//# sourceMappingURL=channel.js.map