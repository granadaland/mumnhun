import { z } from "zod"
import type { AiArticleOutput } from "@/lib/ai/provider"

/**
 * Deterministic Markdown/plain-text → HTML rendering for AI article output.
 *
 * The problem this solves: some OpenAI-compatible gateways return the article as flat
 * prose (no HTML tags, sometimes no Markdown markers either) inside a single string
 * field. Pushed straight into TipTap, that collapses into one heading-less paragraph.
 *
 * The fix is to make the model return STRUCTURED JSON (sections → heading + blocks) and
 * build the HTML here. Structure is then guaranteed by the JSON shape, not by the model
 * emitting correct tags. Inline emphasis and links are still parsed from Markdown because
 * models tend to add them inside text regardless of instructions.
 */

const MAX_SECTIONS = 14
const MAX_BLOCKS_PER_SECTION = 40
const MAX_LIST_ITEMS = 30
const MAX_TABLE_ROWS = 40
const MAX_TABLE_COLUMNS = 10

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
}

/** Strips leading Markdown heading/list markers and surrounding bold that models leak into headings. */
function cleanHeadingText(raw: string): string {
    return raw
        .trim()
        .replace(/^#{1,6}\s+/, "")
        .replace(/^[-*+]\s+/, "")
        .replace(/^\d+[.)]\s+/, "")
        .replace(/^\*\*(.+?)\*\*$/, "$1")
        .replace(/^__(.+?)__$/, "$1")
        .replace(/[:：]\s*$/, "")
        .trim()
}

/**
 * Inline tags the model is allowed to emit inside a text field.
 *
 * Everything is HTML-escaped first, then only these exact simple tags are restored. An
 * attribute, an unknown tag, or a `<script>` stays escaped and inert, so this cannot become
 * an injection path. Anchors are handled separately below because they need an href.
 */
const ALLOWED_INLINE_TAGS = ["strong", "b", "em", "i", "u", "s", "code", "mark", "br"] as const

function restoreAllowedInlineTags(escaped: string): string {
    const tagPattern = new RegExp(`&lt;(/?)(${ALLOWED_INLINE_TAGS.join("|")})\\s*/?&gt;`, "gi")

    return escaped.replace(tagPattern, (_match, slash: string, tag: string) => {
        const normalized = tag.toLowerCase()
        if (normalized === "br") return "<br />"
        return `<${slash}${normalized}>`
    })
}

/** Restores anchors written as HTML, keeping only http/https hrefs. */
function restoreAllowedAnchors(escaped: string): string {
    return escaped
        .replace(
            /&lt;a\s+href=(?:&quot;|")?(https?:\/\/[^\s"&<>]+)(?:&quot;|")?[^&]*?&gt;/gi,
            (_match, href: string) => `<a href="${href}" target="_blank" rel="noopener noreferrer">`
        )
        .replace(/&lt;\/a&gt;/gi, "</a>")
}

/**
 * Renders inline Markdown (bold, italic, links, code) to HTML.
 *
 * HTML is escaped first so raw model output cannot inject markup; a small allowlist of
 * simple inline tags is then restored, which lets the model emit either Markdown or plain
 * inline HTML and get the same result.
 */
export function renderInline(raw: string): string {
    let text = escapeHtml(raw.trim())

    text = restoreAllowedAnchors(text)
    text = restoreAllowedInlineTags(text)

    // Links [label](https://...) — only http/https are allowed through.
    text = text.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        (_match, label: string, url: string) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
    )

    // Bold before italic so ** is consumed first.
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>")

    // Italic: a single * or _ not adjacent to another of the same marker.
    text = text.replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*/g, "$1<em>$2</em>")
    text = text.replace(/(^|[^_])_(?!\s)([^_\n]+?)_/g, "$1<em>$2</em>")

    // Inline code
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>")

    return text
}

function renderParagraph(text: string): string {
    const rendered = renderInline(text)
    return rendered ? `<p>${rendered}</p>` : ""
}

function renderList(items: string[], ordered: boolean): string {
    const listItems = items
        .map((item) => renderInline(item))
        .filter(Boolean)
        .map((item) => `<li>${item}</li>`)
        .join("")

    if (!listItems) return ""
    return ordered ? `<ol>${listItems}</ol>` : `<ul>${listItems}</ul>`
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/**
 * Renders a table from already-split cell text.
 *
 * The first row becomes a `<th>` header row when `hasHeader` is set, which is what both
 * Markdown pipe tables and the structured `table` block produce. Rows are padded or
 * trimmed to the header width so ProseMirror never receives a ragged table (it would
 * otherwise drop the whole node).
 */
export function renderTable(rows: string[][], hasHeader: boolean): string {
    const limitedRows = rows
        .map((row) => row.slice(0, MAX_TABLE_COLUMNS))
        .filter((row) => row.length > 0)
        .slice(0, MAX_TABLE_ROWS)

    if (limitedRows.length === 0) return ""

    const columnCount = Math.max(...limitedRows.map((row) => row.length))
    const normalize = (row: string[]) =>
        Array.from({ length: columnCount }, (_unused, index) => row[index] ?? "")

    const parts: string[] = []
    let bodyRows = limitedRows

    if (hasHeader) {
        const headerCells = normalize(limitedRows[0])
            .map((cell) => `<th>${renderInline(cell) || "&nbsp;"}</th>`)
            .join("")
        parts.push(`<thead><tr>${headerCells}</tr></thead>`)
        bodyRows = limitedRows.slice(1)
    }

    if (bodyRows.length > 0) {
        const body = bodyRows
            .map((row) => {
                const cells = normalize(row)
                    .map((cell) => `<td>${renderInline(cell) || "&nbsp;"}</td>`)
                    .join("")
                return `<tr>${cells}</tr>`
            })
            .join("")
        parts.push(`<tbody>${body}</tbody>`)
    }

    if (parts.length === 0) return ""

    return `<table>${parts.join("")}</table>`
}

/** True for a Markdown table separator row such as `|---|:---:|---:|`. */
function isTableSeparatorLine(line: string): boolean {
    if (!line.includes("-")) return false
    return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line)
}

/** True for any line that looks like a Markdown pipe-table row. */
function isTableRowLine(line: string): boolean {
    return line.includes("|") && /\|/.test(line.replace(/^\||\|$/g, ""))
}

/** Splits `| a | b |` into `["a", "b"]`, tolerating missing outer pipes. */
function splitTableRow(line: string): string[] {
    return line
        .replace(/^\s*\|/, "")
        .replace(/\|\s*$/, "")
        .split("|")
        .map((cell) => cell.trim())
}

// ---------------------------------------------------------------------------
// Structured outline
// ---------------------------------------------------------------------------

export const structuredOutlineSchema = z.object({
    sections: z
        .array(
            z.object({
                heading: z.string().trim().min(1).max(180),
                point: z.string().trim().max(400).optional().nullable(),
                subheadings: z.array(z.string().trim().min(1).max(180)).max(6).optional().default([]),
            })
        )
        .min(3)
        .max(MAX_SECTIONS),
})

export type StructuredOutline = z.infer<typeof structuredOutlineSchema>

/**
 * Renders the outline so every top-level section becomes an H2 (requirement: each outline
 * point maps to an H2 in the editor), each subheading an H3, and the talking point a lead
 * paragraph the writer can expand.
 */
export function renderOutlineHtml(outline: StructuredOutline): string {
    const parts: string[] = []

    for (const section of outline.sections.slice(0, MAX_SECTIONS)) {
        const heading = cleanHeadingText(section.heading)
        if (!heading) continue

        parts.push(`<h2>${escapeHtml(heading)}</h2>`)

        if (section.point?.trim()) {
            parts.push(renderParagraph(section.point))
        }

        for (const sub of section.subheadings ?? []) {
            const subHeading = cleanHeadingText(sub)
            if (subHeading) parts.push(`<h3>${escapeHtml(subHeading)}</h3>`)
        }
    }

    return parts.filter(Boolean).join("\n")
}

// ---------------------------------------------------------------------------
// Structured article
// ---------------------------------------------------------------------------

const articleBlockSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("paragraph"), text: z.string().trim().min(1) }),
    z.object({ type: z.literal("subheading"), text: z.string().trim().min(1).max(180) }),
    z.object({
        type: z.literal("list"),
        ordered: z.boolean().optional().default(false),
        items: z.array(z.string().trim().min(1)).min(1).max(MAX_LIST_ITEMS),
    }),
    z.object({ type: z.literal("quote"), text: z.string().trim().min(1) }),
    z.object({
        type: z.literal("table"),
        // Header row is optional so a plain data grid still renders.
        header: z.array(z.string().trim()).max(MAX_TABLE_COLUMNS).optional().default([]),
        rows: z
            .array(z.array(z.string().trim()).max(MAX_TABLE_COLUMNS))
            .min(1)
            .max(MAX_TABLE_ROWS),
    }),
])

export const structuredArticleSchema = z.object({
    intro: z.array(z.string().trim().min(1)).max(4).optional().default([]),
    sections: z
        .array(
            z.object({
                heading: z.string().trim().min(1).max(180),
                blocks: z.array(articleBlockSchema).min(1).max(MAX_BLOCKS_PER_SECTION),
            })
        )
        .min(2)
        .max(MAX_SECTIONS),
    excerpt: z.string().trim().min(20).max(320).optional().nullable(),
})

export type StructuredArticle = z.infer<typeof structuredArticleSchema>

/**
 * Builds the full article HTML from the structured shape. Headings are emitted as H2/H3,
 * so the output always has real structure even when the model wrote plain sentences.
 */
export function renderArticleHtml(article: StructuredArticle): string {
    const parts: string[] = []

    for (const paragraph of article.intro ?? []) {
        const rendered = renderParagraph(paragraph)
        if (rendered) parts.push(rendered)
    }

    for (const section of article.sections.slice(0, MAX_SECTIONS)) {
        const heading = cleanHeadingText(section.heading)
        if (heading) parts.push(`<h2>${escapeHtml(heading)}</h2>`)

        for (const block of section.blocks.slice(0, MAX_BLOCKS_PER_SECTION)) {
            if (block.type === "paragraph") {
                const rendered = renderParagraph(block.text)
                if (rendered) parts.push(rendered)
            } else if (block.type === "subheading") {
                const sub = cleanHeadingText(block.text)
                if (sub) parts.push(`<h3>${escapeHtml(sub)}</h3>`)
            } else if (block.type === "list") {
                const list = renderList(block.items, block.ordered ?? false)
                if (list) parts.push(list)
            } else if (block.type === "quote") {
                const rendered = renderInline(block.text)
                if (rendered) parts.push(`<blockquote><p>${rendered}</p></blockquote>`)
            } else if (block.type === "table") {
                const header = block.header ?? []
                const hasHeader = header.some((cell) => cell.trim().length > 0)
                const table = renderTable(hasHeader ? [header, ...block.rows] : block.rows, hasHeader)
                if (table) parts.push(table)
            }
        }
    }

    return parts.filter(Boolean).join("\n")
}

// ---------------------------------------------------------------------------
// Salvage: recovering usable articles from non-JSON model output
// ---------------------------------------------------------------------------

const MIN_SALVAGE_RAW_CHARS = 300
const MIN_SALVAGE_TEXT_CHARS = 200

function slugifyLoose(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function stripTags(html: string): string {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Attempts to recover a publishable article from raw model output that failed JSON
 * parsing — typically a gateway that wrote the whole article as Markdown prose.
 *
 * Returns null when the raw text is too short to be an article or converts into too
 * little HTML, so callers can fall back to a reprompt instead of storing junk.
 */
export function salvageArticleOutputFromRaw(
    raw: string,
    fallback: { title: string }
): AiArticleOutput | null {
    const trimmed = (raw ?? "").trim()
    if (trimmed.length < MIN_SALVAGE_RAW_CHARS) return null

    const html = coerceToHtml(trimmed)
    const plain = stripTags(html)
    if (plain.length < MIN_SALVAGE_TEXT_CHARS) return null

    // Prefer the first H2 as the title when the model led with a heading.
    const headingMatch = html.match(/<h[12]>([\s\S]*?)<\/h[12]>/i)
    const derivedTitle = headingMatch ? stripTags(headingMatch[1]) : ""

    const title = (derivedTitle || fallback.title || "").trim().slice(0, 180)

    return {
        title,
        contentHtml: html,
        excerpt: plain.slice(0, 280),
        metaTitle: title.slice(0, 70),
        metaDescription: plain.slice(0, 160),
        focusKeyword: slugifyLoose(fallback.title).slice(0, 60) || fallback.title.slice(0, 60),
        slugSuggestion: slugifyLoose(title || fallback.title).slice(0, 80),
    }
}

/**
 * Recovers an outline from raw non-JSON model output.
 *
 * Outlines are naturally much shorter than articles, so the article-length floor does not
 * apply here: any conversion that yields at least one real heading is accepted, since that
 * is exactly what "Terapkan Outline ke Editor" needs.
 */
export function salvageOutlineHtmlFromRaw(raw: string): string | null {
    const trimmed = (raw ?? "").trim()
    if (trimmed.length < 60) return null

    const html = coerceToHtml(trimmed)
    if (!/<h[1-6]>/.test(html)) return null

    return html
}

// ---------------------------------------------------------------------------
// Defensive coercion for free-form strings (Markdown or plain text → HTML)
// ---------------------------------------------------------------------------

const BLOCK_TAG_PATTERN = /<(h[1-6]|p|ul|ol|li|blockquote|figure|table|pre)\b/i

function flushParagraph(buffer: string[], out: string[]): void {
    if (buffer.length === 0) return
    const text = buffer.join(" ").trim()
    if (text) out.push(renderParagraph(text))
    buffer.length = 0
}

function flushList(items: string[], ordered: boolean, out: string[]): void {
    if (items.length === 0) return
    const list = renderList(items, ordered)
    if (list) out.push(list)
    items.length = 0
}

/**
 * Converts a Markdown or plain-text string into structured HTML.
 *
 * Used as a safety net: if the model returns a bare `contentHtml` string that already
 * contains block-level tags it is passed through untouched; otherwise it is parsed line by
 * line so double newlines become paragraphs, `##`/`#` become headings, `-`/`1.` lines
 * become lists, and Markdown pipe tables become real `<table>` markup. Pure prose with no
 * markers still ends up as clean paragraphs instead of one flat blob.
 */
export function coerceToHtml(raw: string): string {
    const trimmed = (raw ?? "").trim()
    if (!trimmed) return ""

    if (BLOCK_TAG_PATTERN.test(trimmed)) {
        return trimmed
    }

    const lines = trimmed.replace(/\r\n/g, "\n").split("\n")
    const out: string[] = []
    const paragraph: string[] = []
    const listItems: string[] = []
    let listOrdered = false
    let inList = false
    let tableRows: string[][] = []
    let tableHasHeader = false

    const endList = () => {
        if (inList) {
            flushList(listItems, listOrdered, out)
            inList = false
        }
    }

    const endTable = () => {
        if (tableRows.length === 0) return
        const table = renderTable(tableRows, tableHasHeader)
        if (table) out.push(table)
        tableRows = []
        tableHasHeader = false
    }

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index].trim()

        if (!line) {
            flushParagraph(paragraph, out)
            endList()
            endTable()
            continue
        }

        // A separator only ever follows the header row of a table already in progress.
        if (tableRows.length > 0 && isTableSeparatorLine(line)) {
            tableHasHeader = true
            continue
        }

        if (isTableRowLine(line)) {
            // Only start a table when the next line is a separator, or one is already open.
            // Otherwise a prose sentence containing a pipe would be swallowed as a table.
            const nextLine = lines[index + 1]?.trim() ?? ""
            if (tableRows.length > 0 || isTableSeparatorLine(nextLine)) {
                flushParagraph(paragraph, out)
                endList()
                tableRows.push(splitTableRow(line))
                continue
            }
        } else {
            endTable()
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
        if (headingMatch) {
            flushParagraph(paragraph, out)
            endList()
            const level = headingMatch[1].length
            const text = cleanHeadingText(headingMatch[2])
            // h1 is disallowed downstream; map # and ## to h2, deeper to h3.
            const tag = level <= 2 ? "h2" : "h3"
            if (text) out.push(`<${tag}>${escapeHtml(text)}</${tag}>`)
            continue
        }

        const orderedMatch = line.match(/^\d+[.)]\s+(.*)$/)
        const bulletMatch = line.match(/^[-*+]\s+(.*)$/)
        if (orderedMatch || bulletMatch) {
            flushParagraph(paragraph, out)
            const ordered = Boolean(orderedMatch)
            if (inList && ordered !== listOrdered) {
                endList()
            }
            listOrdered = ordered
            inList = true
            listItems.push((orderedMatch ?? bulletMatch)![1])
            continue
        }

        const quoteMatch = line.match(/^>\s+(.*)$/)
        if (quoteMatch) {
            flushParagraph(paragraph, out)
            endList()
            const rendered = renderInline(quoteMatch[1])
            if (rendered) out.push(`<blockquote><p>${rendered}</p></blockquote>`)
            continue
        }

        endList()
        paragraph.push(line)
    }

    flushParagraph(paragraph, out)
    endList()
    endTable()

    return out.filter(Boolean).join("\n")
}
