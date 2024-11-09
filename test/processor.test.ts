import { describe, expect, test } from "@jest/globals";
import * as fs from "node:fs/promises";
import { applyEffect } from "../dist/effect.js";
import { instructionEffect } from "../dist/instructions.js";
import { parseFile, Program, toProgram } from "../dist/parser.js";
import { initializeProcessor, Processor } from "../dist/processor.js";

async function testFile(path: string): Promise<Processor> {
    const code = await fs.readFile(path, { encoding: "utf-8" });
    const lines = parseFile(code);
    expect(lines.isOk()).toBe(true);
    const program = toProgram(lines.value!!);
    const initial = initializeProcessor();
    return runToCompletion(program, initial);
}

function runToCompletion(program: Program, initial: Processor): Processor {
    let processor = initial;
    let instruction;
    while (!processor.halted && processor.pc < program.instructions.length) {
        instruction = program.instructions[processor.pc];
        const effect = instructionEffect(processor, program.labels, instruction);
        processor = applyEffect(processor, effect);
    }

    return processor;
}

describe("processor tests", () => {
    const files = ["test/condition_codes.s"];

    for (const file of files) {
        test(file, async () => {
            const result = await testFile(file);
            expect(result.registers[7]).toBe(0);
        });
    }
});
