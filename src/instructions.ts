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
    | { op: "b"; label: string; condition: Condition }
    | { op: "call"; label: string }
    | { op: "ret" }
    | { op: "hlt" }
    | { op: "nop" }
    | { op: "cmp"; a: Register; b: Value }
    | { op: "mov" | "neg" | "not"; dest: Register; src: Value }
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

const arithOpcode = new Set([
    "add",
    "sub",
    "and",
    "or",
    "xor",
    "lsl",
    "lsr",
    "asr",
    "rol",
    "ror",
]);

export function isRegister(n: number): n is Register {
    return Number.isInteger(n) && n <= 7;
}

export function isArithOpcode(s: string): s is ArithOpcode {
    return arithOpcode.has(s);
}

export function isInstruction(i: unknown): i is Instruction {
    if (typeof i !== "object" || i === null) {
        return false;
    }

    const instruction = i as Instruction;
    switch (instruction.op) {
        case "ldr":
            return isLdr(instruction.dest, instruction.src);
        case "str":
            return isStr(instruction.dest, instruction.src);
        case "b":
            return isB(instruction.label, instruction.condition);
        case "call":
            return typeof instruction.label === "string";
        case "ret":
        case "hlt":
        case "nop":
            return true;
        case "cmp":
            return isTwoOp(instruction.a, instruction.b);
        case "mov":
        case "neg":
        case "not":
            return isTwoOp(instruction.dest, instruction.src);
        default:
            return (
                isArithOpcode(instruction.op) &&
                isArithOp(instruction.dest, instruction.a, instruction.b)
            );
    }
}

function isCondition(cond: string): cond is Condition {
    switch (cond) {
        case "al":
        case "eq":
        case "ne":
        case "gt":
        case "lt":
        case "ge":
        case "le":
        case "hi":
        case "lo":
        case "hs":
        case "ls":
        case "pl":
        case "mi":
        case "vs":
        case "vc":
            return true;
        default:
            return false;
    }
}

function isB(label: unknown, cond: unknown): boolean {
    return typeof label === "string" && typeof cond === "string" && isCondition(cond);
}

function isLdr(dest: unknown, src: unknown): boolean {
    return typeof dest === "number" && isRegister(dest) && isAddress(src);
}

function isStr(dest: unknown, src: unknown): boolean {
    return isAddress(dest) && typeof src === "number" && isRegister(src);
}

function isTwoOp(dest: unknown, src: unknown): boolean {
    return typeof dest === "number" && isRegister(dest) && isValue(src);
}

function isArithOp<S>(dest: unknown, a: unknown, b: unknown): boolean {
    return (
        typeof dest === "number" &&
        isRegister(dest) &&
        typeof a === "number" &&
        isRegister(a) &&
        isValue(b)
    );
}

export function isValue(v: unknown): v is Value {
    if (typeof v !== "object" || v === null) {
        return false;
    }

    const value = v as Value;
    if (value.type === "register") {
        return typeof value.reg === "number" && isRegister(value.reg);
    } else if (value.type === "constant") {
        return typeof value.val === "number" && value.val < 0x100;
    } else {
        return false;
    }
}

export function isAddress(a: unknown): a is Address {
    if (typeof a !== "object" || a === null) {
        return false;
    }

    const addr = a as Address;
    if (addr.type === "register") {
        return typeof addr.reg === "number" && isRegister(addr.reg);
    } else if (addr.type === "address") {
        return typeof addr.addr === "number" && addr.addr < 0x100;
    } else {
        return false;
    }
}

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

function operationFlags(a: number, b: number, c: number): Flags {
    const result = c & 0xff;
    const overflow =
        (a >= 0x80 && b >= 0x80 && result < 0x80) ||
        (a < 0x80 && b < 0x80 && result >= 0x80);

    const flags = {
        carry: (c & ~0xff) != 0,
        negative: result >= 0x80,
        zero: result === 0,
        overflow,
    };

    return flags;
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
        case "call":
            return call(processor, labels, instruction.label);
        case "ret":
            return ret(processor);
        case "hlt":
            return hlt();
        case "nop":
            return nop();
        case "cmp":
            return cmp(processor, instruction.a, instruction.b);
        case "neg":
            return neg(processor, instruction.dest, instruction.src);
        case "not":
            return not(processor, instruction.dest, instruction.src);
        default:
            if (isArithOpcode(instruction.op)) {
                return arithOp(
                    processor,
                    instruction.op,
                    instruction.dest,
                    instruction.a,
                    instruction.b,
                );
            } else {
                throw new Error("instruction not implemented");
            }
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

function call(processor: Processor, labels: Map<string, number>, label: string): Effect {
    return {
        jump: labels.get(label),
        stack: { type: "push", val: processor.pc + 1 },
    };
}

function ret(processor: Processor): Effect {
    if (processor.callStack.length > 0) {
        return {
            jump: processor.callStack[processor.callStack.length - 1],
            stack: { type: "pop" },
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

function cmp(processor: Processor, a: Register, b: Value): Effect {
    const aVal = processor.registers[a]!!;
    const bVal = -evalValue(b, processor.registers) & 0xff;
    const c = aVal + bVal;

    return {
        flags: operationFlags(aVal, bVal, c),
    };
}

function neg(processor: Processor, dest: Register, src: Value): Effect {
    const srcVal = evalValue(src, processor.registers);
    const value = -srcVal & 0xff;

    return {
        regUpdate: {
            reg: dest,
            value: value,
        },
        flags: {
            carry: false,
            overflow: false,
            negative: value >= 0x80,
            zero: value === 0,
        },
    };
}

function not(processor: Processor, dest: Register, src: Value): Effect {
    const srcVal = evalValue(src, processor.registers);
    const value = ~srcVal!! & 0xff;

    return {
        regUpdate: {
            reg: dest,
            value,
        },
        flags: {
            carry: false,
            overflow: false,
            negative: value >= 0x80,
            zero: value === 0,
        },
    };
}

function arithOp(
    processor: Processor,
    op: ArithOpcode,
    dest: Register,
    a: Register,
    b: Value,
): Effect {
    const aVal = processor.registers[a]!!;
    const bVal = evalValue(b, processor.registers);
    const realB = op === "sub" ? -bVal & 0xff : bVal;
    const c = operation(op)(aVal, realB);

    return {
        regUpdate: {
            reg: dest,
            value: c & 0xff,
        },
        flags: operationFlags(aVal, realB, c),
    };
}

function operation(op: ArithOpcode): (a: number, b: number) => number {
    switch (op) {
        case "add":
        case "sub":
            return (a, b) => a + b;
        case "and":
            return (a, b) => a & b;
        case "or":
            return (a, b) => a | b;
        case "xor":
            return (a, b) => a ^ b;
        case "lsl":
            return (a, b) => (a << b) & 0xff;
        case "lsr":
            return (a, b) => (a >> b) & 0xff;
        case "asr":
            return (a, b) => asr(a, b);
        case "rol":
            return rotateLeft;
        case "ror":
            return (a, b) => rotateLeft(a, -b);
    }
}

function asr(a: number, b: number): number {
    const sign = (a & 0x80) !== 0 ? 0xff : 0x00;
    const removed = 8 - b > 0 ? 8 - b : 0;
    const extension = (sign >> removed) << removed;
    const shifted = a >> b;
    return shifted | extension;
}

function rotateLeft(a: number, b: number): number {
    const constrained = b >= 0 ? b % 8 : 8 - (-b % 8);
    const upper = (a << constrained) & 0xff;
    const lower = (a >> (8 - constrained)) & 0xff;
    return upper | lower;
}
