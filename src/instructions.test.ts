import { describe, expect, it } from "@jest/globals";
import { initializeProcessor } from "../dist/processor";
import { Instruction, instructionEffect } from "../dist/instructions";

describe("instructions", () => {
    it("loads register from memory", () => {
        const processor = initializeProcessor();
        processor.memory[0] = 0xa3;
        const labels = new Map();

        const instruction: Instruction = {
            op: "ldr",
            dest: 3,
            src: { type: "address", addr: 0 },
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 3,
                value: 0xa3,
            },
        });
    });

    it("stores register to memory", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 0x5f;
        const labels = new Map();

        const instruction: Instruction = {
            op: "str",
            dest: { type: "address", addr: 10 },
            src: 1,
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            write: {
                addr: 10,
                value: 0x5f,
            },
        });
    });

    it("moves constant to register", () => {
        const processor = initializeProcessor();
        const labels = new Map();

        const instruction: Instruction = {
            op: "mov",
            dest: 2,
            src: { type: "constant", val: 42 },
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 2,
                value: 42,
            },
        });
    });

    it("branches to label if condition is met", () => {
        const processor = initializeProcessor();
        processor.flags.zero = true; // Zero flag for eq condition
        const labels = new Map([["label1", 10]]);

        const instruction: Instruction = {
            op: "b",
            label: "label1",
            condition: "eq",
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            jump: 10,
        });
    });

    it("calls the given label", () => {
        const processor = initializeProcessor();
        const labels = new Map([["label1", 10]]);

        const instruction: Instruction = { op: "call", label: "label1" };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            jump: 10,
            stack: { type: "push", val: 1 },
        });
    });

    it("returns from subroutine", () => {
        const processor = initializeProcessor();
        processor.callStack.push(30);
        const labels = new Map([["label1", 10]]);

        const instruction: Instruction = { op: "ret" };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            jump: 30,
            stack: { type: "pop" },
        });
    });

    it("halts processor", () => {
        const processor = initializeProcessor();
        const labels = new Map();

        const instruction: Instruction = {
            op: "hlt",
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            halt: true,
        });
    });

    it("does nothing (nop)", () => {
        const processor = initializeProcessor();
        const labels = new Map();

        const instruction: Instruction = {
            op: "nop",
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({});
    });

    it("compares a register with a constant and updates flags", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 10; // Set register value
        const labels = new Map();

        const instruction: Instruction = {
            op: "cmp",
            a: 1,
            b: { type: "constant", val: 10 },
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            flags: {
                zero: true,
                negative: false,
                carry: true,
                overflow: false,
            },
        });
    });

    it("negates the value and stores it in the destination register", () => {
        const processor = initializeProcessor();
        processor.registers[3] = 15;
        const labels = new Map();

        const instruction: Instruction = {
            op: "neg",
            dest: 2,
            src: { type: "register", reg: 3 },
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 2,
                value: -15 & 0xff,
            },
            flags: {
                carry: false,
                overflow: false,
                negative: true,
                zero: false,
            },
        });
    });

    it("applies bitwise NOT to a register", () => {
        const processor = initializeProcessor();
        processor.registers[4] = 0b10101010;
        const labels = new Map();

        const instruction: Instruction = {
            op: "not",
            dest: 2,
            src: { type: "register", reg: 4 },
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 2,
                value: 0b01010101,
            },
            flags: {
                carry: false,
                overflow: false,
                negative: false,
                zero: false,
            },
        });
    });

    it("adds two values and updates the destination register", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 5;
        processor.registers[2] = 10;
        const labels = new Map();

        const instruction: Instruction = {
            op: "add",
            dest: 3,
            a: 1,
            b: { type: "register", reg: 2 },
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 3,
                value: 15,
            },
            flags: {
                zero: false, // Result is not zero
                carry: false, // No carry for basic addition
                overflow: false, // No overflow in this case
                negative: false, // Result is positive
            },
        });
    });

    it("adds two values and sets the overflow flag", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 127; // Max positive value for an 8-bit signed integer
        processor.registers[2] = 1; // Adding 1 will cause overflow
        const labels = new Map();

        const instruction: Instruction = {
            op: "add",
            dest: 3,
            a: 1,
            b: { type: "register", reg: 2 },
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 3,
                value: 0x80,
            },
            flags: {
                zero: false, // Result is not zero
                carry: false, // Carry is not set in signed addition
                overflow: true, // Overflow occurs because the result exceeds the max signed 8-bit value
                negative: true, // Result is negative
            },
        });
    });

    it("subtracts two values and updates the destination register", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 20;
        processor.registers[2] = 15;
        const labels = new Map();

        const instruction: Instruction = {
            op: "sub",
            dest: 3,
            a: 1,
            b: { type: "register", reg: 2 },
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 3,
                value: 5,
            },
            flags: {
                zero: false,
                carry: true, // Subtraction that results in a positive number sets carry
                overflow: false,
                negative: false,
            },
        });
    });

    it("performs bitwise AND and updates the destination register", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 0b1100;
        processor.registers[2] = 0b1010;
        const labels = new Map();

        const instruction: Instruction = {
            op: "and",
            dest: 3,
            a: 1,
            b: { type: "register", reg: 2 },
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 3,
                value: 0b1000,
            },
            flags: {
                zero: false,
                carry: false,
                overflow: false,
                negative: false,
            },
        });
    });

    it("performs bitwise OR and updates the destination register", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 0b1100;
        processor.registers[2] = 0b1010;
        const labels = new Map();

        const instruction: Instruction = {
            op: "or",
            dest: 3,
            a: 1,
            b: { type: "register", reg: 2 },
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 3,
                value: 0b1110,
            },
            flags: {
                zero: false,
                carry: false,
                overflow: false,
                negative: false,
            },
        });
    });

    it("performs bitwise XOR and updates the destination register", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 0b1100;
        processor.registers[2] = 0b1010;
        const labels = new Map();

        const instruction: Instruction = {
            op: "xor",
            dest: 3,
            a: 1,
            b: { type: "register", reg: 2 },
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 3,
                value: 0b0110,
            },
            flags: {
                zero: false,
                carry: false,
                overflow: false,
                negative: false,
            },
        });
    });

    it("performs logical shift left and updates the destination register", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 0b0011;
        const labels = new Map();

        const instruction: Instruction = {
            op: "lsl",
            dest: 3,
            a: 1,
            b: { type: "constant", val: 2 }, // Shift left by 2
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 3,
                value: 0b1100,
            },
            flags: {
                zero: false,
                carry: false,
                overflow: false,
                negative: false,
            },
        });
    });

    it("performs logical shift right and updates the destination register", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 0b1100;
        const labels = new Map();

        const instruction: Instruction = {
            op: "lsr",
            dest: 3,
            a: 1,
            b: { type: "constant", val: 2 }, // Shift right by 2
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 3,
                value: 0b0011,
            },
            flags: {
                zero: false,
                carry: false,
                overflow: false,
                negative: false,
            },
        });
    });

    it("performs arithmetic shift right and updates the destination register", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 0x81; // Negative value for arithmetic shift
        const labels = new Map();

        const instruction: Instruction = {
            op: "asr",
            dest: 3,
            a: 1,
            b: { type: "constant", val: 2 }, // Shift right by 2
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 3,
                value: 0xe0, // Arithmetic shift maintains sign
            },
            flags: {
                zero: false,
                carry: false,
                overflow: false,
                negative: true, // Result is negative
            },
        });
    });

    it("performs rotate left and updates the destination register", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 0b01101001;
        const labels = new Map();

        const instruction: Instruction = {
            op: "rol",
            dest: 3,
            a: 1,
            b: { type: "constant", val: 2 }, // Rotate left by 2
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 3,
                value: 0b10100101, // Rotate left shifts bits out and back into the low end
            },
            flags: {
                zero: false,
                carry: false,
                overflow: true,
                negative: true,
            },
        });
    });

    it("performs rotate right and updates the destination register", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 0b01101001;
        const labels = new Map();

        const instruction: Instruction = {
            op: "ror",
            dest: 3,
            a: 1,
            b: { type: "constant", val: 2 }, // Rotate right by 2
        };

        expect(instructionEffect(processor, labels, instruction)).toEqual({
            regUpdate: {
                reg: 3,
                value: 0b01011010, // Rotate right shifts bits out and back into the high end
            },
            flags: {
                zero: false,
                carry: false,
                overflow: false,
                negative: false,
            },
        });
    });
});
