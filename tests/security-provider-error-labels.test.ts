import { describe, expect, it } from "vitest"

const {
    classifyAiKeyFailure,
    classifyProviderFailure,
    toAiKeyFailureHttpStatus,
} = await import("@/lib/security/ai-key-status")

function providerError(status: number, message: string): Error {
    return Object.assign(new Error(message), { name: "OpenAiCompatibleError", status })
}

describe("ai-key-status: custom provider errors are not labelled as Gemini", () => {
    it("maps an OpenAiCompatibleError 401 to a provider-neutral message", () => {
        const failure = classifyProviderFailure(providerError(401, "Provider HTTP 401 (auto): denied"))

        expect(failure.code).toBe("PROVIDER_KEY_INVALID")
        expect(failure.message).not.toMatch(/gemini/i)
        expect(failure.message).toMatch(/provider/i)
    })

    it("classifyAiKeyFailure also recognizes the provider message shape", () => {
        const failure = classifyAiKeyFailure(
            new Error("Provider HTTP 401 (moonshotai/Kimi-K2.6): unauthorized")
        )

        expect(failure.code).toBe("PROVIDER_KEY_INVALID")
        expect(failure.message).not.toMatch(/gemini/i)
    })

    it("treats a provider 400 as a request problem, not an invalid key", () => {
        const failure = classifyProviderFailure(providerError(400, "Provider HTTP 400: bad model"))

        expect(failure.code).toBe("PROVIDER_REQUEST_FAILED")
        expect(toAiKeyFailureHttpStatus(failure)).toBe(400)
    })

    it("maps a provider 404 to model unavailable", () => {
        const failure = classifyProviderFailure(providerError(404, "Provider HTTP 404: no such model"))

        expect(failure.code).toBe("PROVIDER_MODEL_UNAVAILABLE")
    })

    it("maps provider 429 and 5xx correctly", () => {
        expect(classifyProviderFailure(providerError(429, "rate limited")).code).toBe(
            "PROVIDER_RATE_LIMITED"
        )
        expect(classifyProviderFailure(providerError(503, "unavailable")).code).toBe(
            "PROVIDER_UNAVAILABLE"
        )
    })

    it("still labels genuine Gemini failures as Gemini", () => {
        const failure = classifyAiKeyFailure(new Error("Gemini HTTP 401 (gemini-2.5-flash): denied"))

        expect(failure.code).toBe("PROVIDER_KEY_INVALID")
        expect(failure.message).toMatch(/gemini/i)
    })

    it("maps the image endpoint message shape too", () => {
        const failure = classifyProviderFailure(
            new Error("Provider image HTTP 403 (gpt-image-1): forbidden")
        )

        expect(failure.code).toBe("PROVIDER_KEY_INVALID")
        expect(failure.message).not.toMatch(/gemini/i)
    })
})
