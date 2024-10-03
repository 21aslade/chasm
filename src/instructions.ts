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
