/**
 * Robust JSON extraction for LLM output.
 *
 * Gateways return JSON in inconsistent shapes: wrapped in ```json fences, prefixed with
 * prose ("Here is the JSON:"), suffixed with commentary, or with trailing commas that are
 * valid in JS but not JSON. A naive `JSON.parse` on the raw text fails on all of these and
 * surfaces as "Output AI bukan JSON yang valid".
 *
 * This module strips the noise, balances braces to isolate the JSON span even when prose
 * surrounds it, and repairs the most common near-JSON defects before parsing.
 */

export class AiJsonParseError extends Error {
    /** A short, secret-free snippet of what the model actually returned, for diagnostics. */
    snippet: string

    constructor(message: string, snippet: string) {
        super(message)
        this.name = "AiJsonParseError"
        this.snippet = snippet
    }
}

function stripCodeFences(text: string): string {
    const trimmed = text.trim()

    // ```json ... ``` or ``` ... ```
    const fenceMatch = trimmed.match(/```(?:json|javascript|js)?\s*([\s\S]*?)```/i)
    if (fenceMatch?.[1]?.trim()) {
        return fenceMatch[1].trim()
    }

    // A dangling opening fence with no closing fence (truncated output).
    const openFence = trimmed.match(/```(?:json|javascript|js)?\s*([\s\S]*)$/i)
    if (openFence?.[1]?.trim()) {
        return openFence[1].trim()
    }

    return trimmed
}

/**
 * Scans for the first balanced JSON object/array, ignoring braces inside strings.
 * Handles prose before and after the JSON, and tolerates a truncated tail by closing
 * any still-open braces/brackets at the end.
 */
function extractBalancedJson(text: string): string | null {
    const startObject = text.indexOf("{")
    const startArray = text.indexOf("[")

    const candidates = [startObject, startArray].filter((index) => index >= 0)
    if (candidates.length === 0) return null

    const start = Math.min(...candidates)

    const stack: string[] = []
    let inString = false
    let escaped = false
    let end = -1

    for (let i = start; i < text.length; i += 1) {
        const char = text[i]

        if (inString) {
            if (escaped) {
                escaped = false
            } else if (char === "\\") {
                escaped = true
            } else if (char === '"') {
                inString = false
            }
            continue
        }

        if (char === '"') {
            inString = true
            continue
        }

        if (char === "{" || char === "[") {
            stack.push(char)
        } else if (char === "}" || char === "]") {
            stack.pop()
            if (stack.length === 0) {
                end = i
                break
            }
        }
    }

    if (end >= 0) {
        return text.slice(start, end + 1)
    }

    // Truncated output: take from the start and close the still-open containers.
    if (stack.length > 0) {
        let repaired = text.slice(start)
        // Drop a trailing partial string/token so the auto-close does not corrupt a value.
        repaired = repaired.replace(/,\s*"[^"]*$/, "").replace(/,\s*$/, "")
        for (let i = stack.length - 1; i >= 0; i -= 1) {
            repaired += stack[i] === "{" ? "}" : "]"
        }
        return repaired
    }

    return null
}

/** Repairs defects that are common in LLM JSON but invalid per spec. */
function repairJsonDefects(text: string): string {
    return text
        // Trailing commas before a closing brace/bracket.
        .replace(/,(\s*[}\]])/g, "$1")
        // "Smart" quotes some models emit around keys/values.
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
}

function makeSnippet(raw: string): string {
    return raw.replace(/\s+/g, " ").trim().slice(0, 300)
}

/**
 * Parses JSON from raw LLM text, applying escalating recovery strategies.
 * Throws AiJsonParseError with a snippet when nothing parses.
 */
export function parseLlmJson(raw: string): unknown {
    if (typeof raw !== "string" || !raw.trim()) {
        throw new AiJsonParseError("Output AI kosong", "")
    }

    const withoutFences = stripCodeFences(raw)

    // 1. Direct parse (the happy path when json_mode works).
    try {
        return JSON.parse(withoutFences)
    } catch {
        // fall through
    }

    // 2. Isolate the balanced JSON span (handles surrounding prose / truncation).
    const balanced = extractBalancedJson(withoutFences)
    if (balanced) {
        try {
            return JSON.parse(balanced)
        } catch {
            // 3. Repair common defects, then parse again.
            try {
                return JSON.parse(repairJsonDefects(balanced))
            } catch {
                // fall through
            }
        }
    }

    // 4. Last resort: repair the whole fence-stripped text.
    try {
        return JSON.parse(repairJsonDefects(withoutFences))
    } catch {
        throw new AiJsonParseError("Output AI bukan JSON yang valid", makeSnippet(raw))
    }
}
