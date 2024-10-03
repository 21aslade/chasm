import { Register } from "./instructions.js";
import { Flags, memorySize, Processor } from "./processor.js";

export type Effect = {
    flags?: Partial<Flags>;
    write?: Write;
    regUpdate?: RegUpdate;
    output?: number;
    jump?: number;
    halt?: boolean;
};

type RegUpdate = {
    value: number;
    reg: Register;
};

type Write = {
    value: number;
    addr: number;
};

function updateReg(registers: Uint8Array, update: RegUpdate) {
    registers[update.reg] = update.value;
}

function applyWrite(memory: Uint8Array, write: Write) {
    if (write.addr > memorySize) {
        throw new Error(
            `Attempted to write to out of bounds address ${write.addr} (value ${write.value})`,
        );
    }
    memory[write.addr] = write.value;
}

function applyFlags(flags: Flags, setters: Partial<Flags>) {
    flags.carry = setters.carry ?? flags.carry;
    flags.negative = setters.negative ?? flags.negative;
    flags.overflow = setters.overflow ?? flags.overflow;
    flags.zero = setters.zero ?? flags.zero;
}

export function applyEffect(processor: Processor, effect: Effect) {
    if (effect.flags !== undefined) {
        applyFlags(processor.flags, effect.flags);
    }

    if (effect.write !== undefined) {
        applyWrite(processor.memory, effect.write);
    }

    if (effect.regUpdate !== undefined) {
        updateReg(processor.registers, effect.regUpdate);
    }

    if (effect.jump !== undefined) {
        processor.pc = effect.jump;
    }

    if (effect.halt !== undefined) {
        processor.halted = true;
    }
}
