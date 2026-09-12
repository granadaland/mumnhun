import { describe, expect, it } from "vitest"
import { parseLlmJson } from "@/lib/ai/json-extract"
import { salvageOutlineFromTruncatedJson, salvageTitleIdeasFromRaw } from "@/lib/ai/article-format"
import { stripReasoningLeak } from "@/lib/ai/openai-compatible"

// Exact shape from the live outline failure: max_tokens cut mid-string on "membu".
const TRUNCATED_OUTLINE = [
    '{ "sections": [',
    '  { "heading": "Kenapa Mums Perlu Tahu Cara Simpan ASI yang Benar",',
    '    "point": "Berbagai situasi seperti kembali bekerja, produksi ASI berlebih, atau bayi yang perlu perawatan khusus membu',
].join("\n")

const TRUNCATED_OUTLINE_MULTI_SECTION = [
    '{ "sections": [',
    '  { "heading": "Kenapa Mums Perlu Tahu Cara Simpan ASI",',
    '    "point": "Poin pembuka",',
    '    "subheadings": []',
    '  },',
    '  { "heading": "Panduan Suhu dan Durasi Penyimpanan",',
    '    "point": "Suhu ruang, kulkas, dan freezer punya batas berbeda",',
    '    "subheadings": ["Suhu ruang", "Kulkas"]',
    '  },',
    '  { "heading": "Tips Praktis",',
    '    "point": "Berbagai situasi seperti kembali bekerja, produksi berlebih membu',
].join("\n")

describe("parseLlmJson: truncated JSON (finish_reason=length)", () => {
    it("closes an unterminated string value so the prefix parses", () => {
        const parsed = parseLlmJson(TRUNCATED_OUTLINE) as { sections: Array<Record<string, unknown>> }

        expect(Array.isArray(parsed.sections)).toBe(true)
        expect(parsed.sections).toHaveLength(1)
        // The cut string is closed, not dropped — its partial content survives.
        expect(String(parsed.sections[0].heading)).toContain("Kenapa Mums Perlu Tahu")
    })

    it("drops a dangling partial key with no value", () => {
        const raw = `{ "sections": [ { "heading": "Bagian Pertama", "point": "poin" } ], "subhead`
        const parsed = parseLlmJson(raw) as { sections: Array<Record<string, unknown>> }

        expect(Array.isArray(parsed.sections)).toBe(true)
        expect(parsed.sections).toHaveLength(1)
        expect(parsed.sections[0].heading).toBe("Bagian Pertama")
        // The dangling "subhead key is dropped entirely, not force-closed into
        // an invalid "subhead"} tail.
        expect(parsed).not.toHaveProperty("subhead")
    })
})

describe("salvageOutlineFromTruncatedJson", () => {
    it("keeps sections completed before the cut and renders them as HTML", () => {
        const html = salvageOutlineFromTruncatedJson(TRUNCATED_OUTLINE_MULTI_SECTION)

        expect(html).toBeTruthy()
        expect(html).toContain("<h2>Kenapa Mums Perlu Tahu Cara Simpan ASI</h2>")
        expect(html).toContain("<h2>Panduan Suhu dan Durasi Penyimpanan</h2>")
        expect(html).toContain("<h3>Suhu ruang</h3>")
        // The final section lost its point mid-string; its heading still renders and
        // the closed partial point is kept (content the editor can finish by hand).
        expect(html).toContain("<h2>Tips Praktis</h2>")
        expect(html).toContain("membu")
    })

    it("returns null when fewer than 2 complete sections survive", () => {
        expect(salvageOutlineFromTruncatedJson(TRUNCATED_OUTLINE)).toBeNull()
    })
})

describe("stripReasoningLeak (title generation failure)", () => {
    it("removes think-tag reasoning before the answer", () => {
        const raw = [
            "</think>The user wants 6 title ideas for articles about \"simpan asi\" (storing breast milk) in Indonesian.",
            "I should generate catchy, SEO-friendly titles for parenting audience.",
            "</think>",
            "1. Cara Simpan ASI Perah yang Benar di Freezer",
            "2. Berapa Lama ASI Perah Bertahan di Kulkas?",
        ].join("\n")

        expect(stripReasoningLeak(raw)).toContain("Cara Simpan ASI Perah")
        expect(stripReasoningLeak(raw)).not.toContain("The user wants")
    })

    it("removes instruction-restatement prose without think tags", () => {
        const raw = [
            "The user wants 6 title ideas for articles about \"simpan asi\" (storing breast milk) in Indo.",
            "Here are the titles:",
            "1. Cara Simpan ASI Perah yang Benar",
        ].join("\n")

        expect(stripReasoningLeak(raw)).toContain("Cara Simpan ASI Perah")
        expect(stripReasoningLeak(raw)).not.toContain("The user wants")
    })

    it("keeps ordinary content untouched", () => {
        const raw = "1. Cara Simpan ASI Perah yang Benar\n2. Panduan Suhu Penyimpanan ASI"
        expect(stripReasoningLeak(raw)).toContain("Cara Simpan ASI Perah")
    })
})

describe("salvageTitleIdeasFromRaw: reasoning leak defense", () => {
    it("rejects leaked planning prose instead of offering it as titles", () => {
        const leaked = [
            "The user wants 6 title ideas for articles about \"simpan asi\" (storing breast milk) in Indo.",
            "Let me think of catchy Indonesian titles for the parenting audience now.",
        ].join("\n")

        expect(salvageTitleIdeasFromRaw(leaked)).toBeNull()
    })

    it("recovers titles from a numbered list that follows leaked thinking", () => {
        const leaked = [
            "The user wants 6 title ideas. I should write them in Indonesian.",
            "1. Cara Simpan ASI Perah yang Benar di Freezer",
            "2. Berapa Lama ASI Perah Bertahan di Kulkas?",
            "3. Panduan Lengkap Menyimpan ASI untuk Mums Bekerja",
        ].join("\n")

        const salvaged = salvageTitleIdeasFromRaw(leaked)

        expect(salvaged).not.toBeNull()
        expect(salvaged?.titles).toHaveLength(3)
        expect(salvaged?.titles[0]).toContain("Cara Simpan ASI Perah")
    })
})
