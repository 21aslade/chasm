import { describe, expect, it } from "@jest/globals";
import { initializeProcessor } from "../dist/processor";
import { Instruction } from "../dist/instructions";
import { instructionEffect } from "../dist/effect";

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
});
