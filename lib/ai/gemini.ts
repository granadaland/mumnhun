export const GEMINI_MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-flash-001"]

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

export type GeminiMessage = {
    role: "user" | "model"
    parts: Array<{ text: string }>
}

type GeminiResponse = {
    candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
    }>
}

export type GeminiChatOptions = {
    contents: GeminiMessage[]
    systemInstruction?: string
    temperature?: number
    topP?: number
    maxOutputTokens?: number
    jsonMode?: boolean
    timeoutMs?: number
    /** Restrict to a single model instead of walking the fallback list. */
    model?: string | null
}

export type GeminiChatResult = {
    text: string
    model: string
}

/**
 * Calls Gemini generateContent, walking the model fallback list when a model is
 * unavailable (404) on the caller's key tier.
 */
export async function geminiGenerate(
    apiKey: string,
    options: GeminiChatOptions
): Promise<GeminiChatResult> {
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), options.timeoutMs ?? 90_000)

    const models = options.model?.trim() ? [options.model.trim()] : GEMINI_MODEL_CANDIDATES

    try {
        let lastModelError: Error | null = null

        for (let index = 0; index < models.length; index += 1) {
            const model = models[index]
            const endpoint = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(options.systemInstruction
                        ? { systemInstruction: { parts: [{ text: options.systemInstruction }] } }
                        : {}),
                    contents: options.contents,
                    generationConfig: {
                        ...(typeof options.temperature === "number" ? { temperature: options.temperature } : {}),
                        ...(typeof options.topP === "number" ? { topP: options.topP } : {}),
                        ...(typeof options.maxOutputTokens === "number"
                            ? { maxOutputTokens: options.maxOutputTokens }
                            : {}),
                        ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
                    },
                }),
                signal: controller.signal,
            })

            if (!response.ok) {
                const rawText = await response.text().catch(() => "")
                lastModelError = new Error(
                    `Gemini HTTP ${response.status} (${model}): ${rawText.slice(0, 200)}`
                )

                if (response.status === 404 && index < models.length - 1) {
                    continue
                }

                throw lastModelError
            }

            const payload = (await response.json()) as GeminiResponse
            const text = payload.candidates?.[0]?.content?.parts
                ?.map((part) => part.text || "")
                .join("\n")
                .trim()

            if (!text) {
                throw new Error("Gemini tidak mengembalikan konten")
            }

            return { text, model }
        }

        throw lastModelError ?? new Error("Semua model Gemini gagal diakses")
    } finally {
        clearTimeout(timeoutHandle)
    }
}

/** Verifies a Gemini key by listing models on the caller's tier. */
export async function geminiListModels(apiKey: string, timeoutMs = 12_000): Promise<string[]> {
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
            { method: "GET", cache: "no-store", signal: controller.signal }
        )

        if (!response.ok) {
            const rawText = await response.text().catch(() => "")
            throw new Error(`Gemini HTTP ${response.status}: ${rawText.slice(0, 200)}`)
        }

        const payload = (await response.json().catch(() => null)) as
            | { models?: Array<{ name?: unknown }> }
            | null

        const models = payload?.models
        if (!Array.isArray(models)) return []

        return models
            .map((entry) => (typeof entry?.name === "string" ? entry.name.replace(/^models\//, "") : null))
            .filter((name): name is string => Boolean(name))
            .slice(0, 200)
    } finally {
        clearTimeout(timeoutHandle)
    }
}
