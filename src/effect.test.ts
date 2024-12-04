import { describe, expect, it } from "@jest/globals";
import { initializeProcessor } from "../dist/processor.js";
import { applyEffect, Effect, invertEffect } from "../dist/effect.js";

describe("effect", () => {
    it("applies register update", () => {
        const processor = initializeProcessor();
        const effect: Effect = {
            regUpdate: {
                reg: 2,
                value: 42,
            },
        };

        applyEffect(processor, effect);
        expect(processor.registers[2]).toBe(42);
    });

    it("writes to memory", () => {
        const processor = initializeProcessor();
        const effect: Effect = {
            write: {
                addr: 10,
                value: 0x7b,
            },
        };

        applyEffect(processor, effect);
        expect(processor.memory[10]).toBe(0x7b);
    });

    it("updates processor flags", () => {
        const processor = initializeProcessor();
        const effect: Effect = {
            flags: {
                zero: true,
                negative: false,
            },
        };

        applyEffect(processor, effect);
        expect(processor.flags.zero).toBe(true);
        expect(processor.flags.negative).toBe(false);
        expect(processor.flags.carry).toBe(false);
    });

    it("jumps to a new program counter", () => {
        const processor = initializeProcessor();
        const effect: Effect = {
            jump: 100,
        };

        applyEffect(processor, effect);
        expect(processor.pc).toBe(100);
    });

    it("pushes to stack", () => {
        const processor = initializeProcessor();
        const effect: Effect = {
            stack: { type: "push", val: 0x42 },
        };

        applyEffect(processor, effect);
        expect(processor.callStack).toEqual([0x42]);
    });

    it("pops from stack", () => {
        const processor = initializeProcessor();
        processor.callStack.push(0x42);
        const effect: Effect = {
            stack: { type: "pop" },
        };

        applyEffect(processor, effect);
        expect(processor.callStack).toEqual([]);
    });

    it("halts the processor", () => {
        const processor = initializeProcessor();
        const effect: Effect = {
            halt: true,
        };

        applyEffect(processor, effect);
        expect(processor.halted).toBe(true);
    });

    it("applies multiple effects at once", () => {
        const processor = initializeProcessor();
        processor.registers[1] = 5;
        processor.memory[20] = 0x99;

        const effect: Effect = {
            regUpdate: { reg: 1, value: 42 },
            write: { addr: 20, value: 0x55 },
            flags: { zero: true, carry: false },
            jump: 200,
            halt: true,
        };

        applyEffect(processor, effect);
        expect(processor.registers[1]).toBe(42);
        expect(processor.memory[20]).toBe(0x55);
        expect(processor.flags.zero).toBe(true);
        expect(processor.flags.carry).toBe(false);
        expect(processor.pc).toBe(200);
        expect(processor.halted).toBe(true);
    });
});

describe("invertEffect", () => {
    it("inverts a register update", () => {
        const processor = initializeProcessor();
        processor.pc = 10;
        processor.registers[2] = 100; // Initial value of register 2

        const effect: Effect = {
            regUpdate: {
                reg: 2,
                value: 200, // The effect sets register 2 to 200
            },
        };

        expect(invertEffect(processor, effect)).toEqual({
            regUpdate: {
                reg: 2,
                value: 100, // The inversion should restore the previous value
            },
            jump: 10, // Default increment needs to be undone
        });
    });
    it("inverts a memory write", () => {
        const processor = initializeProcessor();
        processor.memory[50] = 123; // Initial value at memory address 50

        const effect: Effect = {
            write: {
                addr: 50,
                value: 999, // The effect writes 999 to memory address 50
            },
        };

        expect(invertEffect(processor, effect)).toEqual({
            write: {
                addr: 50,
                value: 123, // The inversion should restore the original memory value
            },
            jump: 0, // Default increment needs to be undone
        });
    });
    it("inverts a jump effect", () => {
        const processor = initializeProcessor();
        processor.pc = 10; // Initial program counter

        const effect: Effect = {
            jump: 20, // The effect jumps to instruction 20
        };

        expect(invertEffect(processor, effect)).toEqual({
            jump: 10, // The inversion should set the pc back to its original value
        });
    });
});
