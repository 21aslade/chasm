import { Address, ArithOpcode, Instruction, Register, Value } from "./instructions.js";
import { Line } from "./parser.js";

export function printLines(lines: Line[]): string {
    return lines.map(printLine).join("\n");
}

function printLine(line: Line): string {
    const content = lineContent(line);
    if (line.comment === undefined) {
        return content;
    }

    if (content.length > 0) {
        return `${content} ;${line.comment}`;
    } else {
        return `;${line.comment}`;
    }
}

function lineContent(line: Line): string {
    switch (line.type) {
        case "instruction":
            return ` ${printInstruction(line.instruction)}`;
        case "label":
            return `${line.label}:`;
        case "empty":
            return "";
    }
}

function printInstruction(instruction: Instruction): string {
    switch (instruction.op) {
        case "ldr":
            return `ldr ${printRegister(instruction.dest)}, ${printAddress(instruction.src)}`;
        case "str":
            return `str ${printAddress(instruction.dest)}, ${printRegister(instruction.src)}`;
        case "b":
            return printB(instruction.condition, instruction.label);
        case "call":
            return `call ${instruction.label}`;
        case "ret":
        case "hlt":
        case "nop":
            return instruction.op;
        case "cmp":
            return `cmp ${printRegister(instruction.a)}, ${printValue(instruction.b)}`;
        case "mov":
        case "neg":
        case "not":
            return `${instruction.op} ${printRegister(instruction.dest)}, ${printValue(instruction.src)}`;
        default:
            return printArithOp(
                instruction.op,
                instruction.dest,
                instruction.a,
                instruction.b,
            );
    }
}

function printArithOp(op: ArithOpcode, dest: Register, a: Register, b: Value) {
    if (dest === a) {
        return `${op} ${printRegister(a)}, ${printValue(b)}`;
    } else {
        return `${op} ${printRegister(dest)}, ${printRegister(a)}, ${printValue(b)}`;
    }
}

function printB(condition: string, label: string): string {
    if (condition === "al") {
        return `b ${label}`;
    } else {
        return `b${condition} ${label}`;
    }
}

function printAddress(address: Address): string {
    switch (address.type) {
        case "register":
            return `[${printRegister(address.reg)}]`;
        case "address":
            return `[${address.addr}]`;
    }
}

function printValue(value: Value): string {
    switch (value.type) {
        case "register":
            return printRegister(value.reg);
        case "constant":
            return value.val.toString();
    }
}

function printRegister(register: Register): string {
    return `r${register}`;
}
