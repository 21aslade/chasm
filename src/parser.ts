import {
    alt,
    delimited,
    many0,
    opt,
    pair,
    preceded,
    separatedPair,
    terminated,
} from "wombo/multi";
import { eof, hex, regex, tag, uint } from "wombo/text";
import {
    Address,
    ArithOpcode,
    Condition,
    Instruction,
    isRegister,
    Register,
    Value,
} from "./instructions.js";
import { Result } from "wombo/result";
import { completed, Parser, ParserFunction } from "wombo";
import { Option } from "wombo/option";

export type Line = (
    | { type: "instruction"; instruction: Instruction }
    | { type: "label"; label: string }
    | { type: "empty" }
) & { comment?: string };

const space1 = regex(/[ \t]+/).expect("space");
const space0 = opt(space1);

function ws<T>(p: ParserFunction<T>): Parser<T> {
    return delimited(space0, p, space0);
}

const constant = alt(
    preceded(tag("-0x"), hex).map((c) => -c & 0xff),
    preceded(tag("0x"), hex).map((c) => c & 0xff),
    preceded(tag("-"), uint).map((c) => -c & 0xff),
    uint.map((c) => c & 0xff),
);
const register: Parser<Register> = preceded(
    tag("r"),
    uint.tryMap<Register>((n) => {
        if (isRegister(n)) {
            return Result.ok(n);
        } else {
            return Result.err("number 0-7");
        }
    }),
).expect("register");

const value = alt<Value>(
    register.map((reg) => ({ type: "register", reg })),
    constant.map((val) => ({ type: "constant", val })),
);

const addr = delimited(
    tag("["),
    ws(
        alt<Address>(
            register.map((reg) => ({ type: "register", reg })),
            constant.map((addr) => ({ type: "address", addr })),
        ),
    ),
    tag("]"),
);

const ldr = separatedPair(
    tag("ldr"),
    space1,
    ws(separatedPair(register, ws(tag(",")), addr)),
).map(([op, [dest, src]]) => ({ op, dest, src }) as const);

const str = separatedPair(
    tag("str"),
    space1,
    separatedPair(addr, ws(tag(",")), register),
).map(([op, [dest, src]]) => ({ op, dest, src }));

const regVal = separatedPair(register, ws(tag(",")), value);

const mov = separatedPair(tag("mov"), space1, regVal).map(([op, [dest, src]]) => ({
    op,
    dest,
    src,
}));

const condition = alt<Condition>(
    tag("al"),
    tag("eq"),
    tag("ne"),
    tag("gt"),
    tag("le"),
    tag("hi"),
    tag("lo"),
    tag("hs"),
    tag("ls"),
    tag("pl"),
    tag("mi"),
    tag("vs"),
    tag("vc"),
).expect("condition code");

const label = regex(/[_A-Za-z]\w*/).expect("label");

const b = pair(tag("b"), separatedPair(opt(condition), space1, label)).map(
    ([op, [condition, label]]) => ({ op, condition: condition.unwrapOr("al"), label }),
);

const call = separatedPair(tag("call"), space1, label).map(([op, label]) => ({
    op,
    label,
}));

const opOnly = alt(tag("ret"), tag("hlt"), tag("nop")).map((op) => ({ op }));

const cmp = separatedPair(tag("cmp"), space1, regVal).map(([op, [a, b]]) => ({
    op,
    a,
    b,
}));

const binOp = separatedPair(alt(tag("mov"), tag("neg"), tag("not")), space1, regVal).map(
    ([op, [dest, src]]) => ({
        op,
        dest,
        src,
    }),
);

const arithOpcode = alt<ArithOpcode>(
    tag("add"),
    tag("sub"),
    tag("and"),
    tag("or"),
    tag("xor"),
    tag("lsl"),
    tag("lsr"),
    tag("asr"),
    tag("rol"),
    tag("ror"),
);

const arithOperands: Parser<[Register, Register, Value]> = separatedPair(
    register,
    ws(tag(",")),
    alt<[Option<Register>, Value]>(
        pair(
            register,
            preceded(space0, opt(preceded(pair(tag(","), space0), ws(value)))),
        ).map(([a, b]) => {
            if (b.isSome()) {
                return [Option.some(a), b.value];
            } else {
                return [Option.none(), { type: "register", reg: a }];
            }
        }),
        constant.map((val) => [Option.none(), { type: "constant", val }]),
    ),
).map(([a, [b, c]]) => [a, b.unwrapOr(a), c]);

const arithOp = separatedPair(arithOpcode, space1, arithOperands).map(
    ([op, [dest, a, b]]) => ({ op, dest, a, b }),
);

const instruction = alt<Instruction>(
    ldr,
    str,
    b,
    call,
    opOnly,
    cmp,
    binOp,
    arithOp,
).expect("opcode");

const comment = preceded(tag(";"), regex(/[^\n]*/));

const lineEnding = terminated(
    opt(comment),
    alt(
        tag("\n"),
        eof.map(() => "\n"),
    ),
);

const line = pair(
    alt<Line>(
        pair(preceded(space1, opt(instruction)), lineEnding).map(([i, c]) => {
            if (i.isSome()) {
                return { type: "instruction", instruction: i.value, comment: c.value };
            } else {
                return { type: "empty", comment: c.value };
            }
        }),
        pair(terminated(label, tag(":")), lineEnding).map(([l, c]) => ({
            type: "label",
            label: l,
            comment: c.value,
        })),
        lineEnding.map((c) => ({ type: "empty", comment: c.value })),
    ),
    lineEnding,
);

export const parseFile = completed(many0(line));

export function toInstructions(lines: Line[]): [Instruction[], Map<string, number>] {
    let instructions = [];
    let labels = new Map<string, number>();
    let pc = 0;
    for (const line of lines) {
        switch (line?.type) {
            case "instruction":
                instructions.push(line.instruction);
                pc++;
                break;
            case "label":
                labels.set(line.label, pc);
                break;
        }
    }

    return [instructions, labels];
}
