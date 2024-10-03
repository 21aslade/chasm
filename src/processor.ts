export type Processor = {
    registers: Uint8Array;
    memory: Uint8Array;
    flags: Flags;
    pc: number;
    halted: boolean;
};

export type Flags = {
    zero: boolean;
    carry: boolean;
    overflow: boolean;
    negative: boolean;
};

export const registerCount = 8;
export const memorySize = 256;

export function initializeProcessor(): Processor {
    return {
        registers: new Uint8Array(registerCount),
        memory: new Uint8Array(memorySize),
        flags: {
            zero: false,
            carry: false,
            overflow: false,
            negative: false,
        },
        pc: 0,
        halted: false,
    };
}
