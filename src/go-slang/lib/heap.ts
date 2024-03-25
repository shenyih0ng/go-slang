const word_size = 8
const size_offset = 5

// Tags
const False_tag = 0;
const True_tag = 1;
const Number_tag = 2;

export class Heap {
    private memory: DataView
    private next: number = 0;
    private True: number;
    private False: number;

    constructor(words: number) {
        this.memory = new DataView(new ArrayBuffer(words * word_size));
        this.True = this.allocate(True_tag, 1);
        this.False = this.allocate(False_tag, 1);
    }

    public allocate(tag: number, size: number): number {
        const address = this.next;
        this.next += size;
        this.memory.setInt8(address * word_size, tag);
        this.memory.setUint16(address * word_size + size_offset, size);
        return address;
    }

    public jsValueToAddress = (value: any): number => {
        if (typeof value === 'boolean') {
            return value ? this.True : this.False
        }
        if (typeof value === 'number') {
            return this.allocateNumber(value)
        }
        // In case of error
        return -1
    }

    public addressToJsValue = (address: number): any => {
        if (this.isFalse(address)) {
            return false
        }
        if (this.isTrue(address)) {
            return true
        }
        if (this.isNumber(address)) {
            return this.get(address + 1)
        }
        // In case of error
        return null
    }


    // Getters
    public get(address: number): number {
        return this.memory.getFloat64(address * word_size)
    }

    public getTag(address: number): number {
        return this.memory.getInt8(address * word_size)
    }

    // Setters
    public set(address: number, value: number): void {
        this.memory.setFloat64(address * word_size, value)
    }

    // Number allocation
    // 1 byte tag, 4 bytes empty, 2 bytes size, 1 byte empty, 8 bytes value
    public allocateNumber(number: number) {
        const address = this.allocate(Number_tag, 2)
        this.set(address + 1, number)
        return address
    }

    public isNumber(address: number): boolean {
        return this.getTag(address) === Number_tag
    }

    // Boolean allocation
    public isFalse(address: number): boolean {
        return this.getTag(address) === False_tag
    }

    public isTrue(address: number): boolean {
        return this.getTag(address) === True_tag
    }

    public isBoolean(address: number): boolean {
        return this.isFalse(address) || this.isTrue(address)
    }
}
