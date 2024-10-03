import { describe, expect, it } from "@jest/globals";
import { initializeProcessor } from "../dist/processor.js";
import { applyEffect, Effect } from "../dist/effect.js";

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
