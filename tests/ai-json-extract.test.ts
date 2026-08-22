import { describe, expect, it } from "vitest"
import { AiJsonParseError, parseLlmJson } from "@/lib/ai/json-extract"

describe("json-extract: parseLlmJson", () => {
    it("parses clean JSON", () => {
        expect(parseLlmJson('{"a":1,"b":"x"}')).toEqual({ a: 1, b: "x" })
    })

    it("strips ```json fences", () => {
        const raw = '```json\n{"ideas": [1, 2, 3]}\n```'
        expect(parseLlmJson(raw)).toEqual({ ideas: [1, 2, 3] })
    })

    it("strips bare ``` fences", () => {
        expect(parseLlmJson('```\n{"ok": true}\n```')).toEqual({ ok: true })
    })

    it("ignores prose before and after the JSON", () => {
        const raw = 'Berikut hasilnya:\n{"gapSummary": "ringkas", "ideas": []}\nSemoga membantu!'
        expect(parseLlmJson(raw)).toEqual({ gapSummary: "ringkas", ideas: [] })
    })

    it("removes trailing commas", () => {
        expect(parseLlmJson('{"a": [1, 2, 3,], "b": {"c": 1,},}')).toEqual({
            a: [1, 2, 3],
            b: { c: 1 },
        })
    })

    it("normalizes smart quotes", () => {
        const raw = '{\u201ckey\u201d: \u201cvalue\u201d}'
        expect(parseLlmJson(raw)).toEqual({ key: "value" })
    })

    it("does not treat braces inside strings as structure", () => {
        const raw = '{"text": "gunakan {kurung} dan [siku] di teks", "n": 1}'
        expect(parseLlmJson(raw)).toEqual({ text: "gunakan {kurung} dan [siku] di teks", n: 1 })
    })

    it("recovers a truncated object by closing open braces", () => {
        // Simulates output cut off by a token limit mid-array.
        const raw = '{"gapSummary": "ok", "ideas": [{"title": "Satu"}, {"title": "Dua"}'
        const parsed = parseLlmJson(raw) as { gapSummary: string; ideas: Array<{ title: string }> }
        expect(parsed.gapSummary).toBe("ok")
        expect(parsed.ideas[0].title).toBe("Satu")
    })

    it("parses a top-level array", () => {
        expect(parseLlmJson('[{"a":1},{"a":2}]')).toEqual([{ a: 1 }, { a: 2 }])
    })

    it("throws AiJsonParseError with a snippet when nothing parses", () => {
        try {
            parseLlmJson("maaf, saya tidak bisa membuat JSON untuk permintaan ini")
            throw new Error("expected throw")
        } catch (error) {
            expect(error).toBeInstanceOf(AiJsonParseError)
            expect((error as AiJsonParseError).snippet).toContain("maaf")
        }
    })

    it("throws on empty input", () => {
        expect(() => parseLlmJson("   ")).toThrowError(AiJsonParseError)
    })
})
