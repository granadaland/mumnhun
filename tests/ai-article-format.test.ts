import { describe, expect, it } from "vitest"
import {
    coerceToHtml,
    renderArticleHtml,
    renderInline,
    renderOutlineHtml,
    renderTable,
    salvageArticleOutputFromRaw,
    structuredArticleSchema,
    structuredOutlineSchema,
} from "@/lib/ai/article-format"

describe("article-format: renderInline", () => {
    it("escapes HTML before applying Markdown", () => {
        expect(renderInline("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d")
    })

    it("renders bold, italic, and inline code", () => {
        expect(renderInline("ini **tebal** dan *miring* dan `kode`")).toBe(
            "ini <strong>tebal</strong> dan <em>miring</em> dan <code>kode</code>"
        )
    })

    it("renders only http/https Markdown links and marks them safe", () => {
        expect(renderInline("lihat [situs](https://example.com) ya")).toBe(
            'lihat <a href="https://example.com" target="_blank" rel="noopener noreferrer">situs</a> ya'
        )
    })

    it("does not turn a javascript: link into an anchor", () => {
        const out = renderInline("[klik](javascript:alert(1))")
        // The non-http scheme is left as inert escaped text, never an anchor/href.
        expect(out).not.toContain("<a")
        expect(out).not.toContain("href=")
    })

    it("keeps simple inline HTML the model emitted", () => {
        expect(renderInline("ini <strong>tebal</strong> dan <em>miring</em>")).toBe(
            "ini <strong>tebal</strong> dan <em>miring</em>"
        )
        expect(renderInline("baris<br>lanjut")).toBe("baris<br />lanjut")
    })

    it("keeps an http anchor written as HTML and forces safe rel", () => {
        const out = renderInline('lihat <a href="https://example.com">situs</a>')
        expect(out).toBe(
            'lihat <a href="https://example.com" target="_blank" rel="noopener noreferrer">situs</a>'
        )
    })

    it("does not restore an anchor with a javascript: href", () => {
        const out = renderInline('<a href="javascript:alert(1)">klik</a>')
        // Left fully escaped, so the browser renders it as text, not a link.
        expect(out).not.toContain("<a href")
        expect(out).toContain("&lt;a href=")
    })

    it("keeps disallowed tags escaped", () => {
        const out = renderInline('teks <script>alert(1)</script> lanjut')
        expect(out).not.toContain("<script")
        expect(out).toContain("&lt;script&gt;")
    })

    it("does not restore an allowed tag that carries attributes", () => {
        const out = renderInline('<strong onclick="alert(1)">tebal</strong>')
        // The opening tag keeps its escaping, so no attribute reaches the DOM.
        expect(out).not.toContain("<strong onclick")
        expect(out).toContain("&lt;strong onclick=")
    })
})

describe("article-format: renderOutlineHtml maps every section to H2", () => {
    it("emits H2 per section and H3 per subheading", () => {
        const outline = structuredOutlineSchema.parse({
            sections: [
                { heading: "Kenapa ASI penting", point: "Alasan utama", subheadings: ["Manfaat jangka pendek"] },
                { heading: "Cara menyimpan", point: "Langkah praktis", subheadings: [] },
                { heading: "FAQ", subheadings: [] },
            ],
        })

        const html = renderOutlineHtml(outline)

        expect(html).toContain("<h2>Kenapa ASI penting</h2>")
        expect(html).toContain("<h3>Manfaat jangka pendek</h3>")
        expect(html).toContain("<h2>Cara menyimpan</h2>")
        expect(html).toContain("<h2>FAQ</h2>")
        // Exactly three H2s, one per section.
        expect((html.match(/<h2>/g) || []).length).toBe(3)
    })

    it("strips leaked Markdown markers from headings", () => {
        const outline = structuredOutlineSchema.parse({
            sections: [
                { heading: "## **Bagian Satu**" },
                { heading: "1. Bagian Dua:" },
                { heading: "Bagian Tiga" },
            ],
        })

        const html = renderOutlineHtml(outline)
        expect(html).toContain("<h2>Bagian Satu</h2>")
        expect(html).toContain("<h2>Bagian Dua</h2>")
        expect(html).not.toContain("##")
        expect(html).not.toContain("**")
    })
})

describe("article-format: renderArticleHtml builds structured HTML", () => {
    it("renders intro, headings, lists, and inline emphasis", () => {
        const article = structuredArticleSchema.parse({
            intro: ["Paragraf pembuka untuk Mums."],
            sections: [
                {
                    heading: "Langkah Menyimpan ASI",
                    blocks: [
                        { type: "paragraph", text: "Simpan **segera** setelah diperah." },
                        { type: "subheading", text: "Di kulkas" },
                        { type: "list", ordered: false, items: ["Gunakan wadah steril", "Beri label tanggal"] },
                        { type: "list", ordered: true, items: ["Dinginkan", "Bekukan"] },
                        { type: "quote", text: "Tips penting untuk Mums." },
                    ],
                },
                {
                    heading: "Penutup",
                    blocks: [{ type: "paragraph", text: "Langkah lanjutan yang konkret." }],
                },
            ],
            excerpt: "Panduan menyimpan ASI perah dengan aman untuk Mums yang baru mulai.",
        })

        const html = renderArticleHtml(article)

        expect(html).toContain("<p>Paragraf pembuka untuk Mums.</p>")
        expect(html).toContain("<h2>Langkah Menyimpan ASI</h2>")
        expect(html).toContain("<h3>Di kulkas</h3>")
        expect(html).toContain("<strong>segera</strong>")
        expect(html).toContain("<ul><li>Gunakan wadah steril</li><li>Beri label tanggal</li></ul>")
        expect(html).toContain("<ol><li>Dinginkan</li><li>Bekukan</li></ol>")
        expect(html).toContain("<blockquote><p>Tips penting untuk Mums.</p></blockquote>")
        expect(html).toContain("<h2>Penutup</h2>")
        expect((html.match(/<h2>/g) || []).length).toBe(2)
    })
})

describe("article-format: coerceToHtml fallback", () => {
    it("passes through content that already has block tags", () => {
        const html = "<h2>Judul</h2><p>Isi</p>"
        expect(coerceToHtml(html)).toBe(html)
    })

    it("converts Markdown headings, lists, and paragraphs", () => {
        const md = [
            "## Bagian Satu",
            "",
            "Paragraf pertama dengan **penekanan**.",
            "",
            "### Sub Bagian",
            "- Poin satu",
            "- Poin dua",
            "",
            "1. Langkah A",
            "2. Langkah B",
        ].join("\n")

        const html = coerceToHtml(md)

        expect(html).toContain("<h2>Bagian Satu</h2>")
        expect(html).toContain("<h3>Sub Bagian</h3>")
        expect(html).toContain("<strong>penekanan</strong>")
        expect(html).toContain("<ul><li>Poin satu</li><li>Poin dua</li></ul>")
        expect(html).toContain("<ol><li>Langkah A</li><li>Langkah B</li></ol>")
    })

    it("turns plain prose with blank lines into separate paragraphs", () => {
        const plain = "Kalimat pembuka tanpa tanda apa pun.\n\nParagraf kedua yang juga polos."
        const html = coerceToHtml(plain)

        expect(html).toBe(
            "<p>Kalimat pembuka tanpa tanda apa pun.</p>\n<p>Paragraf kedua yang juga polos.</p>"
        )
    })

    it("does not leave the whole text as one flat blob", () => {
        const plain = "Baris satu.\n\nBaris dua.\n\nBaris tiga."
        const html = coerceToHtml(plain)
        expect((html.match(/<p>/g) || []).length).toBe(3)
    })

    it("returns empty string for empty input", () => {
        expect(coerceToHtml("   ")).toBe("")
    })
})

describe("article-format: tables", () => {
    it("renderTable emits thead/th when a header row is given", () => {
        const html = renderTable(
            [
                ["Paket", "Harga"],
                ["1 Bulan", "Rp160.000"],
                ["3 Bulan", "Rp325.000"],
            ],
            true
        )

        expect(html).toContain("<table>")
        expect(html).toContain("<thead><tr><th>Paket</th><th>Harga</th></tr></thead>")
        expect(html).toContain("<td>1 Bulan</td><td>Rp160.000</td>")
    })

    it("renderTable pads short rows so ProseMirror never sees a ragged grid", () => {
        const html = renderTable([["A", "B", "C"], ["satu"]], true)
        // Body row is padded from 1 to 3 cells to match the header width.
        expect((html.match(/<td>/g) || []).length).toBe(3)
    })

    it("renders an empty string when there are no rows", () => {
        expect(renderTable([], false)).toBe("")
    })

    it("structuredArticleSchema accepts table blocks and renders them", () => {
        const article = structuredArticleSchema.parse({
            sections: [
                {
                    heading: "Perbandingan Paket",
                    blocks: [
                        {
                            type: "table",
                            header: ["Paket", "Harga"],
                            rows: [["1 Bulan", "Rp160.000"]],
                        },
                    ],
                },
                {
                    heading: "Penutup",
                    blocks: [{ type: "paragraph", text: "Pilih paket sesuai kebutuhan Mums." }],
                },
            ],
        })

        const html = renderArticleHtml(article)
        expect(html).toContain("<thead><tr><th>Paket</th><th>Harga</th></tr></thead>")
        expect(html).toContain("<td>1 Bulan</td><td>Rp160.000</td>")
    })

    it("coerceToHtml converts Markdown pipe tables into real <table> markup", () => {
        const md = [
            "## Harga Sewa",
            "",
            "| Paket | Harga |",
            "| --- | --- |",
            "| 1 Bulan | Rp160.000 |",
            "| 6 Bulan | Rp550.000 |",
            "",
            "Paragraf penutup.",
        ].join("\n")

        const html = coerceToHtml(md)

        expect(html).toContain("<h2>Harga Sewa</h2>")
        expect(html).toContain("<thead><tr><th>Paket</th><th>Harga</th></tr></thead>")
        expect(html).toContain("<td>1 Bulan</td><td>Rp160.000</td>")
        expect(html).toContain("<td>6 Bulan</td><td>Rp550.000</td>")
        expect(html).toContain("<p>Paragraf penutup.</p>")
    })

    it("coerceToHtml keeps prose containing pipes as paragraphs, not tables", () => {
        const md = "Kalimat dengan tanda | di tengah tanpa baris pemisah.\n\nParagraf kedua."
        const html = coerceToHtml(md)

        expect(html).not.toContain("<table")
        expect((html.match(/<p>/g) || []).length).toBe(2)
    })
})

describe("article-format: salvageArticleOutputFromRaw", () => {
    const LONG_MARKDOWN = [
        "## Judul Artikel yang Cukup Panjang",
        "",
        "Paragraf pembuka yang menjelaskan konteks secara cukup panjang agar lolos ambang penyelamatan, karena Mums butuh penjelasan yang memadai sebelum mulai mempraktikkan langkah penyimpanan ASI perah di rumah.",
        "",
        "### Subbagian",
        "",
        "- Poin satu dengan penjelasan singkat dan jelas untuk dibaca",
        "- Poin dua yang melengkapi poin pertama dengan contoh konkret",
    ].join("\n")

    it("mengubah Markdown panjang menjadi output artikel lengkap", () => {
        const salvaged = salvageArticleOutputFromRaw(LONG_MARKDOWN, { title: "topik cadangan" })

        expect(salvaged).not.toBeNull()
        expect(salvaged!.title).toContain("Judul Artikel")
        expect(salvaged!.contentHtml).toContain("<h2>")
        expect(salvaged!.contentHtml).toContain("<ul>")
        expect(salvaged!.excerpt.length).toBeGreaterThan(0)
        expect(salvaged!.slugSuggestion).toMatch(/^[a-z0-9-]+$/)
    })

    it("menolak raw terlalu pendek untuk disebut artikel", () => {
        expect(salvageArticleOutputFromRaw("maaf, gagal.", { title: "x" })).toBeNull()
    })
})
