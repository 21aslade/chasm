import { Register } from "./instructions.js";
import { Flags, memorySize, Processor } from "./processor.js";

export type Effect = {
    flags?: Partial<Flags>;
    write?: Write;
    regUpdate?: RegUpdate;
    jump?: number;
    stack?: StackUpdate;
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

type StackUpdate = { type: "push"; val: number } | { type: "pop" };

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
    } else {
        processor.pc++;
    }

    switch (effect.stack?.type) {
        case "push":
            processor.callStack.push(effect.stack.val);
            break;
        case "pop":
            processor.callStack.pop();
            break;
    }

    if (effect.halt !== undefined) {
        processor.halted = effect.halt;
    }
}

function invertFlags(original: Flags, delta: Partial<Flags>): Partial<Flags> {
    return {
        carry: delta.carry !== undefined ? original.carry : undefined,
        negative: delta.negative !== undefined ? original.negative : undefined,
        overflow: delta.overflow !== undefined ? original.overflow : undefined,
        zero: delta.zero !== undefined ? original.zero : undefined,
    };
}

function invertStack(original: number[], update: StackUpdate): StackUpdate | undefined {
    switch (update.type) {
        case "pop":
            if (original.length > 0) {
                return { type: "push", val: original[original.length - 1]!! };
            } else {
                return undefined;
            }
        case "push":
            return { type: "pop" };
    }
}

export function invertEffect(processor: Processor, effect: Effect): Effect {
    const flags =
        effect.flags !== undefined
            ? invertFlags(processor.flags, effect.flags)
            : undefined;
    const write =
        effect.write !== undefined
            ? { addr: effect.write.addr, value: processor.memory[effect.write.addr]!! }
            : undefined;
    const regUpdate =
        effect.regUpdate !== undefined
            ? {
                  reg: effect.regUpdate.reg,
                  value: processor.registers[effect.regUpdate.reg]!!,
              }
            : undefined;
    const jump = processor.pc;
    const halt = effect.halt ? !effect.halt : undefined;
    const stack =
        effect.stack !== undefined
            ? invertStack(processor.callStack, effect.stack)
            : undefined;

    return {
        flags,
        write,
        regUpdate,
        jump,
        stack,
        halt,
    };
}
