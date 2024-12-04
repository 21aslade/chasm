export type Processor = {
    registers: Uint8Array;
    memory: Uint8Array;
    flags: Flags;
    pc: number;
    callStack: number[];
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
        callStack: [],
        halted: false,
    };
}

export function cloneProcessor(processor: Processor): Processor {
    return {
        registers: new Uint8Array(processor.registers),
        memory: new Uint8Array(processor.memory),
        flags: { ...processor.flags },
        pc: processor.pc,
        callStack: [...processor.callStack],
        halted: processor.halted,
    };
}
