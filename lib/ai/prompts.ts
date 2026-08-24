import { z } from "zod"

/**
 * Editorial voice contract for every text task.
 *
 * The house style is modelled on Indonesian parenting media (HaiBunda): warm, direct,
 * second-person, and practical. The audience is always addressed as "Mums". The
 * anti-AI-detection guidance here is about writing habits that make text read as
 * machine-written (uniform sentence length, stock transitions, hedging filler), not
 * about evading detectors.
 */
export const HAIBUNDA_VOICE = `Kamu adalah editor senior media parenting Indonesia bergaya HaiBunda.

GAYA WAJIB:
- Sapa pembaca sebagai "Mums". Gunakan sudut pandang orang kedua, hangat, dan setara.
- Bahasa Indonesia sehari-hari yang rapi. Hindari bahasa kaku/formal ala siaran pers.
- Kalimat bervariasi panjangnya. Selipkan kalimat pendek untuk penegasan.
- Konkret dan bisa langsung dipraktikkan: angka, durasi, suhu, langkah nyata.
- Empatik tanpa menghakimi pilihan Mums.

DILARANG (membuat tulisan terasa hasil mesin):
- Frasa pembuka klise: "Di era digital ini", "Seiring berkembangnya", "Tidak dapat dipungkiri".
- Transisi kaku berulang: "Selain itu", "Lebih lanjut", "Oleh karena itu" di tiap paragraf.
- Kesimpulan berisi ringkasan kosong tanpa informasi baru.
- Kalimat panjang seragam dan paragraf berukuran identik.
- Klaim medis absolut. Untuk hal medis, arahkan konsultasi ke dokter atau konselor laktasi.
- Menyalin kalimat dari sumber lain. Tulis ulang sepenuhnya dengan kalimat sendiri.

SEO:
- Focus keyword muncul natural di judul, paragraf pembuka, dan minimal satu subjudul.
- Jangan menumpuk keyword. Gunakan variasi dan sinonim.`

export const JSON_ONLY_INSTRUCTION =
    "Jawab HANYA dengan JSON object valid. Tanpa markdown code fence, tanpa teks lain."

// ---------------------------------------------------------------------------
// Title ideas
// ---------------------------------------------------------------------------

export const titleIdeasOutputSchema = z.object({
    titles: z.array(z.string().trim().min(10).max(90)).min(3).max(10),
})

export function buildTitleIdeasPrompt(input: { topic: string; keyword?: string | null }): string {
    return `Buat 6 ide judul artikel untuk topik: "${input.topic}".
${input.keyword ? `Focus keyword: ${input.keyword}` : ""}

Syarat setiap judul:
- Natural, menarik, dan singkat (ideal 45-65 karakter, maksimal 90).
- Terasa seperti judul media parenting, bukan judul iklan atau clickbait berlebihan.
- SEO friendly: mengandung kata kunci utama atau variasinya di bagian depan.
- Tanpa tanda kutip, tanpa emoji, tanpa ALL CAPS.
- Bervariasi bentuknya: ada yang how-to, ada yang pertanyaan, ada yang pernyataan.

${JSON_ONLY_INSTRUCTION}
Format: {"titles": ["Judul pertama", "Judul kedua"]}`
}

// ---------------------------------------------------------------------------
// Outline (structured JSON — HTML is built server-side, see article-format.ts)
// ---------------------------------------------------------------------------

export { structuredOutlineSchema as outlineStructuredSchema } from "@/lib/ai/article-format"

export function buildOutlinePrompt(input: {
    title: string
    keyword?: string | null
    angle?: string | null
}): string {
    return `Buat outline artikel untuk judul: "${input.title}".
${input.keyword ? `Focus keyword: ${input.keyword}` : ""}
${input.angle ? `Angle yang diminta: ${input.angle}` : ""}

Syarat outline:
- 5-7 bagian utama. Setiap bagian menjadi satu subjudul H2 di artikel.
- Urutan logis: mulai dari kebutuhan/masalah Mums, lalu penjelasan, lalu langkah praktis.
- Judul bagian natural dan spesifik, bukan template generik seperti "Pendahuluan" atau "Kesimpulan".
- Tiap bagian boleh punya 0-3 subbagian (akan menjadi H3).
- Sertakan satu bagian FAQ singkat di akhir bila topiknya cocok.

Kembalikan JSON dengan bentuk PERSIS berikut:
{
  "sections": [
    {
      "heading": "Judul bagian (akan jadi H2)",
      "point": "Satu kalimat ringkas soal yang dibahas di bagian ini",
      "subheadings": ["Subjudul opsional (akan jadi H3)"]
    }
  ]
}

Aturan penting:
- "heading" berisi teks polos saja, TANPA tanda #, tanpa angka, tanpa tag HTML.
- "subheadings" boleh array kosong [] bila tidak perlu.
${JSON_ONLY_INSTRUCTION}`
}

// ---------------------------------------------------------------------------
// Full article from outline (structured JSON — HTML built server-side)
// ---------------------------------------------------------------------------

export { structuredArticleSchema as fullContentStructuredSchema } from "@/lib/ai/article-format"

export function buildFullContentPrompt(input: {
    title: string
    outline: string
    keyword?: string | null
    targetWordCount?: number
}): string {
    const wordCount = input.targetWordCount ?? 1100

    return `Tulis artikel utuh berdasarkan outline berikut, dengan gaya HaiBunda.

Judul: ${input.title}
${input.keyword ? `Focus keyword: ${input.keyword}` : ""}
Target panjang: sekitar ${wordCount} kata.

OUTLINE YANG HARUS DIIKUTI (tiap bagian di sini menjadi satu section dengan heading H2):
${input.outline}

Syarat penulisan:
- Bangun artikel MENGIKUTI urutan bagian pada outline. Tiap bagian outline = satu objek section.
- "heading" tiap section = judul bagian tersebut (teks polos, tanpa tanda # atau HTML).
- Isi tiap section dengan "blocks": paragraf, subheading (H3), list, atau quote.
- Paragraf pendek, 2-4 kalimat, panjang bervariasi. Paragraf pembuka (intro) langsung menyentuh
  situasi nyata Mums tanpa basa-basi.
- Sertakan minimal satu block bertipe "list" berisi langkah atau checklist praktis.
- Bila isinya memang berupa perbandingan, spesifikasi, atau daftar harga, gunakan block
  bertipe "table" (bukan paragraf berisi pipa "|").
- Untuk penekanan, gunakan **teks tebal** atau *teks miring* di dalam teks (format Markdown inline).
- Sebut "Mums" secara wajar, tidak di setiap paragraf.
- Tulisan 100% orisinal. Jangan mengutip atau meniru kalimat dari sumber lain.
- Akhiri dengan langkah lanjutan konkret, bukan ringkasan kosong.

Kembalikan JSON dengan bentuk PERSIS berikut:
{
  "intro": ["Paragraf pembuka 1", "Paragraf pembuka 2 (opsional)"],
  "sections": [
    {
      "heading": "Judul bagian (akan jadi H2)",
      "blocks": [
        { "type": "paragraph", "text": "Isi paragraf. Boleh pakai **tebal**/*miring*." },
        { "type": "subheading", "text": "Subjudul opsional (akan jadi H3)" },
        { "type": "list", "ordered": false, "items": ["Poin pertama", "Poin kedua"] },
        { "type": "quote", "text": "Kutipan atau tips penting (opsional)" },
        {
          "type": "table",
          "header": ["Kolom 1", "Kolom 2"],
          "rows": [["Baris 1 kolom 1", "Baris 1 kolom 2"]]
        }
      ]
    }
  ],
  "excerpt": "Ringkasan 1-2 kalimat, maksimal 300 karakter"
}

Aturan penting:
- Untuk penekanan di dalam "text"/"items", boleh pakai Markdown (**tebal**, *miring*) ATAU
  tag HTML inline sederhana: <strong>, <em>, <u>, <s>, <code>, <a href="https://...">.
- JANGAN menaruh tag blok (<p>, <h2>, <ul>, <div>) di dalam "text"/"items" — struktur blok
  sudah ditentukan oleh "type" dan "heading".
- Pada block "table", setiap baris di "rows" wajib punya jumlah kolom yang sama dengan "header".
- Setiap section wajib punya minimal satu block.
${JSON_ONLY_INSTRUCTION}`
}

/**
 * Fallback prompt used when a gateway cannot reliably return the nested JSON shape.
 * Asks for Markdown, which is then converted to HTML by coerceToHtml(). This keeps a
 * structured result even from models that only do free-form text well.
 */
export function buildFullContentMarkdownPrompt(input: {
    title: string
    outline: string
    keyword?: string | null
    targetWordCount?: number
}): string {
    const wordCount = input.targetWordCount ?? 1100

    return `Tulis artikel utuh berdasarkan outline berikut, dengan gaya HaiBunda.

Judul: ${input.title}
${input.keyword ? `Focus keyword: ${input.keyword}` : ""}
Target panjang: sekitar ${wordCount} kata.

OUTLINE YANG HARUS DIIKUTI:
${input.outline}

Format keluaran WAJIB Markdown yang rapi:
- Setiap bagian outline menjadi subjudul dengan "## " (H2).
- Subbagian memakai "### " (H3).
- Paragraf dipisah baris kosong. Pendek, 2-4 kalimat, panjang bervariasi.
- Daftar langkah memakai "- " (bullet) atau "1. " (bernomor).
- Tabel perbandingan/harga memakai tabel pipa Markdown lengkap dengan baris pemisah, contoh:
  | Paket | Harga |
  | --- | --- |
  | 1 Bulan | Rp160.000 |
- Penekanan memakai **tebal** atau *miring* seperlunya.
- Sertakan minimal satu daftar langkah/checklist praktis.
- Paragraf pembuka langsung menyentuh situasi nyata Mums, tanpa basa-basi.
- Jangan membungkus jawaban dalam code fence.
- Tulisan 100% orisinal, akhiri dengan langkah lanjutan konkret.

Jawab HANYA dengan artikel Markdown-nya, tanpa komentar pembuka atau penutup.`
}

// ---------------------------------------------------------------------------
// SEO package (keywords, meta, schema, category, tags)
// ---------------------------------------------------------------------------

export const seoPackageOutputSchema = z.object({
    focusKeyword: z.string().trim().min(2).max(120),
    secondaryKeywords: z.array(z.string().trim().min(2).max(120)).max(10).default([]),
    metaTitle: z.string().trim().min(10).max(70),
    metaDescription: z.string().trim().min(50).max(165),
    schemaType: z.enum(["Article", "BlogPosting", "HowTo", "FAQPage"]),
    categorySlug: z.string().trim().min(1).max(120).nullable().default(null),
    tags: z.array(z.string().trim().min(2).max(60)).max(12).default([]),
    // Optional so older gateways that omit them still validate. The editor treats an
    // empty value as "keep what is already there".
    slug: z.string().trim().max(90).optional().default(""),
    ogTitle: z.string().trim().max(90).optional().default(""),
    ogDescription: z.string().trim().max(200).optional().default(""),
})

export type SeoPackageOutput = z.infer<typeof seoPackageOutputSchema>

export function buildSeoPackagePrompt(input: {
    title: string
    content: string
    keyword?: string | null
    availableCategories: Array<{ slug: string; name: string }>
    existingTags: string[]
}): string {
    const categoryList = input.availableCategories
        .map((category) => `- ${category.slug} (${category.name})`)
        .join("\n")

    const tagHint = input.existingTags.length
        ? `Tag yang sudah ada di situs (utamakan memakai ini bila relevan): ${input.existingTags.slice(0, 60).join(", ")}`
        : "Belum ada tag di situs."

    return `Buat paket metadata SEO untuk artikel berikut.

Judul: ${input.title}
${input.keyword ? `Focus keyword yang sudah ditetapkan: ${input.keyword}` : ""}
Isi artikel (dipotong): ${input.content.slice(0, 4000)}

Aturan:
- "focusKeyword": satu frasa kunci utama. Jika sudah ditetapkan di atas, pertahankan.
- "secondaryKeywords": maksimal 6 keyword pendukung yang benar-benar dibahas di artikel.
- "metaTitle": maksimal 60 karakter, mengandung focus keyword, natural.
- "metaDescription": 120-155 karakter, mengandung focus keyword, dan memuat alasan untuk klik.
- "schemaType": pilih salah satu dari Article, BlogPosting, HowTo, FAQPage sesuai bentuk isi artikel.
- "categorySlug": WAJIB dipilih dari daftar kategori di bawah, dan harus yang paling relevan.
  Jika tidak ada yang benar-benar relevan, kembalikan null. JANGAN membuat kategori baru.
- "tags": maksimal 8 tag. Boleh membuat tag baru bila memang lebih tepat.
- "slug": slug URL yang SEO friendly. Huruf kecil, hanya a-z, 0-9, dan tanda hubung.
  Maksimal 6 kata, mengandung focus keyword, tanpa kata sambung berlebihan.
- "ogTitle": judul untuk share media sosial. Maksimal 70 karakter, boleh lebih menggugah
  daripada metaTitle.
- "ogDescription": deskripsi share media sosial, 100-180 karakter, tanpa mengulang
  metaDescription kata per kata.

KATEGORI YANG TERSEDIA (hanya boleh pilih dari sini):
${categoryList || "- (belum ada kategori)"}

${tagHint}

${JSON_ONLY_INSTRUCTION}`
}

// ---------------------------------------------------------------------------
// Image prompt + alt text + caption
// ---------------------------------------------------------------------------

export const imageMetaOutputSchema = z.object({
    imagePrompt: z.string().trim().min(20).max(900),
    altText: z.string().trim().min(10).max(160),
    caption: z.string().trim().min(10).max(220),
})

export type ImageMetaOutput = z.infer<typeof imageMetaOutputSchema>

export function buildImageMetaPrompt(input: {
    title: string
    context?: string | null
    keyword?: string | null
    purpose: "featured" | "inline"
}): string {
    const purposeHint =
        input.purpose === "featured"
            ? "Gambar ini adalah featured image (hero) artikel, rasio lanskap."
            : "Gambar ini akan diletakkan di tengah artikel untuk memperjelas satu bagian pembahasan."

    return `Buat materi gambar untuk artikel parenting berikut.

Judul artikel: ${input.title}
${input.keyword ? `Focus keyword: ${input.keyword}` : ""}
${input.context ? `Konteks bagian terkait: ${input.context.slice(0, 800)}` : ""}
${purposeHint}

Kembalikan JSON dengan key:
- "imagePrompt": prompt bahasa Inggris untuk model text-to-image. Deskripsikan subjek, suasana,
  pencahayaan, dan komposisi. Fotografi natural, hangat, bersih. Wajib akhiri dengan
  "no text, no watermark, no logo". Jangan meminta wajah selebriti atau merek nyata.
- "altText": alt text bahasa Indonesia, maksimal 125 karakter, deskriptif untuk pembaca layar,
  mengandung kata kunci secara natural. Jangan mulai dengan "Gambar" atau "Foto".
- "caption": caption bahasa Indonesia 1 kalimat yang menambah informasi bagi Mums,
  bukan mengulang alt text.

${JSON_ONLY_INSTRUCTION}`
}

// ---------------------------------------------------------------------------
// Content audit: ideas + 30-day calendar + internal links
// ---------------------------------------------------------------------------

export const auditIdeaSchema = z.object({
    title: z.string().trim().min(10).max(140),
    angle: z.string().trim().max(300).optional().nullable(),
    focusKeyword: z.string().trim().min(2).max(120),
    secondaryKeywords: z.array(z.string().trim().min(2).max(120)).max(8).default([]),
    categorySlug: z.string().trim().max(120).optional().nullable(),
    rationale: z.string().trim().max(400).optional().nullable(),
    /** 1-based slot in the 30-day plan; the server maps this onto real dates. */
    dayOffset: z.coerce.number().int().min(1).max(30),
})

export const auditLinkSuggestionSchema = z.object({
    sourceSlug: z.string().trim().min(1).max(200),
    targetSlug: z.string().trim().min(1).max(200),
    exactPhrase: z.string().trim().min(3).max(200),
    rationale: z.string().trim().max(300).optional().nullable(),
})

export const contentAuditOutputSchema = z.object({
    gapSummary: z.string().trim().min(20).max(2000),
    ideas: z.array(auditIdeaSchema).min(1).max(30),
    linkSuggestions: z.array(auditLinkSuggestionSchema).max(60).default([]),
})

export type ContentAuditOutput = z.infer<typeof contentAuditOutputSchema>

export type AuditPostSummary = {
    slug: string
    title: string
    focusKeyword: string | null
    categorySlugs: string[]
    excerpt: string | null
}

export function buildContentAuditPrompt(input: {
    posts: AuditPostSummary[]
    availableCategories: Array<{ slug: string; name: string }>
    ideaCount: number
}): string {
    const inventory = input.posts
        .map((post, index) => {
            const parts = [`${index + 1}. [${post.slug}] ${post.title}`]
            if (post.focusKeyword) parts.push(`   keyword: ${post.focusKeyword}`)
            if (post.categorySlugs.length) parts.push(`   kategori: ${post.categorySlugs.join(", ")}`)
            if (post.excerpt) parts.push(`   ringkas: ${post.excerpt.slice(0, 160)}`)
            return parts.join("\n")
        })
        .join("\n")

    const categoryList = input.availableCategories
        .map((category) => `- ${category.slug} (${category.name})`)
        .join("\n")

    return `Kamu mengaudit arsip artikel sebuah situs parenting Indonesia yang juga melayani
sewa freezer ASI. Berikut seluruh artikel yang sudah publish.

INVENTARIS ARTIKEL:
${inventory}

KATEGORI YANG TERSEDIA (hanya boleh pilih dari sini, jangan membuat baru):
${categoryList || "- (belum ada kategori)"}

Tugas:
1. "gapSummary": analisis singkat (maksimal 250 kata) tentang topik yang sudah jenuh,
   topik yang belum tergarap, dan peluang kata kunci yang masih terbuka.
2. "ideas": tepat ${input.ideaCount} ide artikel BARU yang belum ada di inventaris.
   - Judul natural, menarik, singkat, gaya media parenting, SEO friendly.
   - "focusKeyword" harus berbeda dari keyword artikel yang sudah ada.
   - "categorySlug" wajib dari daftar kategori di atas, atau null bila tidak ada yang relevan.
   - "dayOffset": angka 1-30. Sebar merata; jangan menumpuk banyak ide pada hari yang sama.
   - "rationale": alasan singkat mengapa ide ini mengisi gap.
3. "linkSuggestions": peluang internal link antar artikel yang SUDAH ADA.
   - "sourceSlug" dan "targetSlug" wajib diambil dari slug pada inventaris di atas.
   - "exactPhrase": frasa yang benar-benar mungkin muncul di artikel sumber, 3-8 kata,
     dan relevan dengan artikel target. Jangan mengarang frasa panjang.
   - Maksimal 3 saran per artikel sumber.

${JSON_ONLY_INSTRUCTION}`
}
