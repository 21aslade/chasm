import { describe, expect, it } from "@jest/globals";
import { Line, toProgram } from "../dist/parser";

describe("toProgram", () => {
    it("converts lines with a single label and instructions", () => {
        const lines: Line[] = [
            { type: "label", label: "start" },
            {
                type: "instruction",
                instruction: { op: "mov", dest: 0, src: { type: "constant", val: 5 } },
            },
            { type: "instruction", instruction: { op: "hlt" } },
        ];

        expect(toProgram(lines)).toEqual({
            instructions: [
                { op: "mov", dest: 0, src: { type: "constant", val: 5 } },
                { op: "hlt" },
            ],
            labels: new Map([["start", 0]]),
            pcToLine: [1, 2],
            lineToPc: [undefined, 0, 1],
        });
    });

    it("converts lines with multiple instructions and no labels", () => {
        const lines: Line[] = [
            {
                type: "instruction",
                instruction: { op: "mov", dest: 1, src: { type: "constant", val: 10 } },
            },
            {
                type: "instruction",
                instruction: { op: "str", dest: { type: "register", reg: 2 }, src: 1 },
            },
            { type: "instruction", instruction: { op: "hlt" } },
        ];

        expect(toProgram(lines)).toEqual({
            instructions: [
                { op: "mov", dest: 1, src: { type: "constant", val: 10 } },
                { op: "str", dest: { type: "register", reg: 2 }, src: 1 },
                { op: "hlt" },
            ],
            labels: new Map(),
            pcToLine: [0, 1, 2],
            lineToPc: [0, 1, 2],
        });
    });

    it("ignores empty lines and comments", () => {
        const lines: Line[] = [
            { type: "empty" },
            {
                type: "instruction",
                instruction: { op: "mov", dest: 3, src: { type: "constant", val: 1 } },
                comment: "Load 1 into r3",
            },
            { type: "empty", comment: "A comment-only line" },
            { type: "instruction", instruction: { op: "hlt" }, comment: "Halt" },
        ];

        expect(toProgram(lines)).toEqual({
            instructions: [
                { op: "mov", dest: 3, src: { type: "constant", val: 1 } },
                { op: "hlt" },
            ],
            labels: new Map(),
            pcToLine: [1, 3],
            lineToPc: [undefined, 0, undefined, 1],
        });
    });
});
