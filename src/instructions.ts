import { Effect } from "./effect.js";
import { Flags, memorySize, Processor } from "./processor.js";

export type Register = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ArithOpcode =
    | "add"
    | "sub"
    | "and"
    | "or"
    | "xor"
    | "lsl"
    | "lsr"
    | "asr"
    | "rol"
    | "ror";

export type Instruction =
    | { op: "ldr"; dest: Register; src: Address }
    | { op: "str"; dest: Address; src: Register }
    | { op: "mov"; dest: Register; src: Value }
    | { op: "b"; label: string; condition: Condition }
    | { op: "cmp"; a: Register; b: Value }
    | { op: "neg"; dest: Register; src: Register }
    | { op: "not"; dest: Register; src: Register }
    | { op: "hlt" }
    | { op: "nop" }
    | ArithOp<ArithOpcode>;

type ArithOp<S extends string> = { op: S; dest: Register; a: Register; b: Value };

export type Value =
    | { type: "register"; reg: Register }
    | { type: "constant"; val: number };

export type Address =
    | { type: "register"; reg: Register }
    | { type: "address"; addr: number };

export type Condition =
    | "al"
    | "eq"
    | "ne"
    | "gt"
    | "lt"
    | "ge"
    | "le"
    | "hi"
    | "lo"
    | "hs"
    | "ls"
    | "pl"
    | "mi"
    | "vs"
    | "vc";

function derefAddr(addr: Address, registers: Uint8Array, memory: Uint8Array): number {
    const address = addr.type === "register" ? registers[addr.reg]!! : addr.addr;
    if (address > memorySize) {
        throw new Error(`Attempted to read from out of bounds address ${address}`);
    }

    return memory[address]!!;
}

function evalAddr(addr: Address, registers: Uint8Array): number {
    if (addr.type === "register") {
        return registers[addr.reg]!!;
    } else {
        return addr.addr;
    }
}

function evalValue(value: Value, registers: Uint8Array): number {
    if (value.type === "register") {
        return registers[value.reg]!!;
    } else {
        return value.val;
    }
}

function meetsCondition(cond: Condition, flags: Flags): boolean {
    switch (cond) {
        case "al":
            return true;
        case "eq":
            return flags.zero;
        case "ne":
            return !flags.zero;
        case "gt":
            return !flags.zero && flags.negative === flags.overflow;
        case "lt":
            return flags.negative !== flags.overflow;
        case "ge":
            return flags.negative === flags.overflow;
        case "le":
            return flags.zero || flags.negative !== flags.overflow;
        case "hi":
            return flags.carry && !flags.zero;
        case "lo":
            return !flags.carry;
        case "hs":
            return flags.carry;
        case "ls":
            return !flags.carry || flags.zero;
        case "pl":
            return !flags.negative;
        case "mi":
            return flags.negative;
        case "vs":
            return flags.overflow;
        case "vc":
            return !flags.overflow;
    }
}

export function instructionEffect(
    processor: Processor,
    labels: Map<string, number>,
    instruction: Instruction,
): Effect {
    switch (instruction.op) {
        case "ldr":
            return ldr(processor, instruction.dest, instruction.src);
        case "str":
            return str(processor, instruction.dest, instruction.src);
        case "mov":
            return mov(processor, instruction.dest, instruction.src);
        case "b":
            return b(processor, labels, instruction.label, instruction.condition);
        case "hlt":
            return hlt();
        case "nop":
            return nop();
        default:
            throw new Error("instruction not implemented");
    }
}

function ldr(processor: Processor, dest: Register, src: Address): Effect {
    return {
        regUpdate: {
            reg: dest,
            value: derefAddr(src, processor.registers, processor.memory),
        },
    };
}

function str(processor: Processor, dest: Address, src: Register): Effect {
    return {
        write: {
            addr: evalAddr(dest, processor.registers),
            value: processor.registers[src]!!,
        },
    };
}

function mov(processor: Processor, dest: Register, src: Value): Effect {
    return {
        regUpdate: {
            reg: dest,
            value: evalValue(src, processor.registers),
        },
    };
}

function b(
    processor: Processor,
    labels: Map<string, number>,
    label: string,
    contition: Condition,
): Effect {
    if (meetsCondition(contition, processor.flags)) {
        return {
            jump: labels.get(label),
        };
    } else {
        return {};
    }
}

function hlt(): Effect {
    return { halt: true };
}

function nop(): Effect {
    return {};
}
