import { describe, expect, it } from "vitest"

const {
    classifyAiKeyFailure,
    formatStoredAiKeyFailure,
    parseStoredAiKeyFailure,
    sanitizeAiKeyErrorMessage,
    toAiKeyFailureHttpStatus,
} = await import("@/lib/security/ai-key-status")

const { UrlGuardError } = await import("@/lib/security/url-guard")

describe("ai-key-status: secret masking", () => {
    it("masks Gemini keys", () => {
        const masked = sanitizeAiKeyErrorMessage("invalid key AIzaSyA1234567890abcdefghij")
        expect(masked).toContain("AIza***")
        expect(masked).not.toContain("AIzaSyA1234567890abcdefghij")
    })

    it("masks OpenAI-style keys including project-scoped variants", () => {
        const masked = sanitizeAiKeyErrorMessage("401 for sk-proj-abcdef1234567890XYZ token")
        expect(masked).toContain("sk-***")
        expect(masked).not.toContain("abcdef1234567890XYZ")
    })

    it("masks OpenRouter-style keys", () => {
        const masked = sanitizeAiKeyErrorMessage("provider rejected sk-or-v1-0123456789abcdef")
        expect(masked).not.toContain("0123456789abcdef")
        expect(masked).toContain("sk-***")
    })

    it("masks bearer tokens echoed back by providers", () => {
        const masked = sanitizeAiKeyErrorMessage('request failed: Authorization: Bearer abcdef1234567890TOKEN')
        expect(masked).not.toContain("abcdef1234567890TOKEN")
    })

    it("masks api_key style query and JSON fields", () => {
        expect(sanitizeAiKeyErrorMessage("GET /models?api_key=supersecretvalue123")).not.toContain(
            "supersecretvalue123"
        )
        expect(sanitizeAiKeyErrorMessage('{"api_key":"supersecretvalue123"}')).not.toContain(
            "supersecretvalue123"
        )
    })

    it("falls back to a generic message for empty input", () => {
        expect(sanitizeAiKeyErrorMessage("   ")).toBe("Terjadi kesalahan koneksi API key AI")
    })

    it("truncates very long messages", () => {
        const masked = sanitizeAiKeyErrorMessage("x".repeat(1000))
        expect(masked.length).toBeLessThanOrEqual(300)
    })
})

describe("ai-key-status: failure classification", () => {
    it("maps URL guard errors to a base-url specific code", () => {
        const failure = classifyAiKeyFailure(
            new UrlGuardError("Host mengarah ke alamat internal", "URL_PRIVATE_ADDRESS_BLOCKED")
        )

        expect(failure.code).toBe("PROVIDER_BASE_URL_INVALID")
        expect(toAiKeyFailureHttpStatus(failure)).toBe(400)
    })

    it("keeps Gemini HTTP status inference working", () => {
        expect(classifyAiKeyFailure(new Error("Gemini HTTP 429 rate limited")).code).toBe(
            "PROVIDER_RATE_LIMITED"
        )
        expect(classifyAiKeyFailure(new Error("Gemini HTTP 503 unavailable")).code).toBe(
            "PROVIDER_UNAVAILABLE"
        )
        expect(classifyAiKeyFailure(new Error("Gemini HTTP 401 unauthorized")).code).toBe(
            "PROVIDER_KEY_INVALID"
        )
    })

    it("classifies network and timeout failures", () => {
        const abortError = new Error("aborted")
        abortError.name = "AbortError"

        expect(classifyAiKeyFailure(abortError).code).toBe("NETWORK_TIMEOUT")
        expect(classifyAiKeyFailure(new Error("fetch failed")).code).toBe("NETWORK_ERROR")
    })

    it("maps model unavailability to 400", () => {
        expect(toAiKeyFailureHttpStatus({ code: "PROVIDER_MODEL_UNAVAILABLE", message: "x" })).toBe(400)
    })

    it("round-trips stored failures without leaking secrets", () => {
        const stored = formatStoredAiKeyFailure({
            code: "PROVIDER_KEY_INVALID",
            message: "rejected sk-proj-abcdef1234567890",
        })

        expect(stored).not.toContain("abcdef1234567890")

        const parsed = parseStoredAiKeyFailure(stored)
        expect(parsed?.code).toBe("PROVIDER_KEY_INVALID")
        expect(parsed?.message).toContain("sk-***")
    })
})
