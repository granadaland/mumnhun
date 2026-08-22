import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:dns/promises", () => ({
    lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}))

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const {
    authStyleCandidates,
    buildAuthHeaders,
    chatCompletion,
    isAuthStyle,
    listModels,
    normalizeBaseUrl,
    probeProvider,
} = await import("@/lib/ai/openai-compatible")

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    })
}

function errorResponse(status: number, text = "denied"): Response {
    return new Response(text, { status, headers: { "content-type": "text/plain" } })
}

function headersOfCall(index: number): Headers {
    return new Headers(mockFetch.mock.calls[index][1]?.headers)
}

function urlOfCall(index: number): string {
    return String(mockFetch.mock.calls[index][0])
}

describe("openai-compatible: auth style helpers", () => {
    it("builds the header for each style", () => {
        expect(buildAuthHeaders("k1", "bearer")).toEqual({ Authorization: "Bearer k1" })
        expect(buildAuthHeaders("k1", "raw")).toEqual({ Authorization: "k1" })
        expect(buildAuthHeaders("k1", "x-api-key")).toEqual({ "x-api-key": "k1" })
    })

    it("puts the preferred style first and keeps the rest as fallbacks", () => {
        expect(authStyleCandidates("raw")).toEqual(["raw", "bearer", "x-api-key"])
        expect(authStyleCandidates(null)).toEqual(["bearer", "raw", "x-api-key"])
        expect(authStyleCandidates("nonsense" as never)).toEqual(["bearer", "raw", "x-api-key"])
    })

    it("validates persisted values", () => {
        expect(isAuthStyle("bearer")).toBe(true)
        expect(isAuthStyle("x-api-key")).toBe(true)
        expect(isAuthStyle("basic")).toBe(false)
        expect(isAuthStyle(null)).toBe(false)
    })

    it("strips trailing slashes from the base URL", () => {
        expect(normalizeBaseUrl("https://api.example.com/v1/")).toBe("https://api.example.com/v1")
        expect(normalizeBaseUrl("  https://api.example.com/v1///  ")).toBe("https://api.example.com/v1")
    })
})

describe("openai-compatible: chatCompletion", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("calls {baseUrl}/chat/completions and returns the message content", async () => {
        mockFetch.mockResolvedValueOnce(
            jsonResponse({ choices: [{ message: { content: "hasilnya di sini" } }] })
        )

        const result = await chatCompletion(
            { baseUrl: "https://ai.example.com/v1", apiKey: "sk-test", model: "auto" },
            { messages: [{ role: "user", content: "hi" }] }
        )

        expect(result.text).toBe("hasilnya di sini")
        expect(result.authStyle).toBe("bearer")
        expect(urlOfCall(0)).toBe("https://ai.example.com/v1/chat/completions")
    })

    it("falls back to the raw Authorization header when Bearer is rejected", async () => {
        mockFetch
            .mockResolvedValueOnce(errorResponse(401))
            .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "ok" } }] }))

        const result = await chatCompletion(
            { baseUrl: "https://ai.example.com/v1", apiKey: "APIKEY123", model: "auto" },
            { messages: [{ role: "user", content: "hi" }] }
        )

        expect(result.authStyle).toBe("raw")
        expect(headersOfCall(0).get("authorization")).toBe("Bearer APIKEY123")
        expect(headersOfCall(1).get("authorization")).toBe("APIKEY123")
    })

    it("falls back to x-api-key when both Authorization styles fail", async () => {
        mockFetch
            .mockResolvedValueOnce(errorResponse(401))
            .mockResolvedValueOnce(errorResponse(403))
            .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "ok" } }] }))

        const result = await chatCompletion(
            { baseUrl: "https://ai.example.com/v1", apiKey: "K", model: "auto" },
            { messages: [{ role: "user", content: "hi" }] }
        )

        expect(result.authStyle).toBe("x-api-key")
        expect(headersOfCall(2).get("x-api-key")).toBe("K")
    })

    it("retries without json_mode when the gateway rejects response_format", async () => {
        mockFetch
            .mockResolvedValueOnce(errorResponse(400, "response_format unsupported"))
            .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: '{"a":1}' } }] }))

        const result = await chatCompletion(
            { baseUrl: "https://ai.example.com/v1", apiKey: "sk", model: "auto" },
            { messages: [{ role: "user", content: "hi" }], jsonMode: true }
        )

        expect(result.text).toBe('{"a":1}')

        const firstBody = JSON.parse(String(mockFetch.mock.calls[0][1]?.body))
        const secondBody = JSON.parse(String(mockFetch.mock.calls[1][1]?.body))
        expect(firstBody.response_format).toEqual({ type: "json_object" })
        expect(secondBody.response_format).toBeUndefined()
    })

    it("does not retry other auth styles for a non-auth failure", async () => {
        mockFetch.mockResolvedValueOnce(errorResponse(500, "boom"))

        await expect(
            chatCompletion(
                { baseUrl: "https://ai.example.com/v1", apiKey: "sk", model: "auto" },
                { messages: [{ role: "user", content: "hi" }] }
            )
        ).rejects.toMatchObject({ name: "OpenAiCompatibleError", status: 500 })

        expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("uses reasoning_content when content is empty", async () => {
        mockFetch.mockResolvedValueOnce(
            jsonResponse({ choices: [{ message: { content: "", reasoning_content: "jawaban" } }] })
        )

        const result = await chatCompletion(
            { baseUrl: "https://ai.example.com/v1", apiKey: "sk", model: "auto" },
            { messages: [{ role: "user", content: "hi" }] }
        )

        expect(result.text).toBe("jawaban")
    })

    it("omits optional sampling params when not provided", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "x" } }] }))

        await chatCompletion(
            { baseUrl: "https://ai.example.com/v1", apiKey: "sk", model: "auto" },
            { messages: [{ role: "user", content: "hi" }] }
        )

        const body = JSON.parse(String(mockFetch.mock.calls[0][1]?.body))
        expect(body).toEqual({ model: "auto", messages: [{ role: "user", content: "hi" }] })
    })
})

describe("openai-compatible: listModels", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("parses the OpenAI data[] shape", async () => {
        mockFetch.mockResolvedValueOnce(
            jsonResponse({
                data: [
                    { id: "moonshotai/Kimi-K2.6", owned_by: "moonshot" },
                    { id: "gpt-4o-mini" },
                ],
            })
        )

        const result = await listModels({ baseUrl: "https://ai.example.com/v1", apiKey: "sk" })

        expect(result.models).toEqual([
            { id: "moonshotai/Kimi-K2.6", ownedBy: "moonshot" },
            { id: "gpt-4o-mini", ownedBy: null },
        ])
        expect(urlOfCall(0)).toBe("https://ai.example.com/v1/models")
    })

    it("also parses a models[] shape and de-duplicates", async () => {
        mockFetch.mockResolvedValueOnce(
            jsonResponse({ models: [{ id: "a" }, { name: "b" }, { id: "a" }] })
        )

        const result = await listModels({ baseUrl: "https://ai.example.com/v1", apiKey: "sk" })
        expect(result.models.map((m) => m.id)).toEqual(["a", "b"])
    })

    it("returns an empty list when the payload has no recognizable models", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }))

        const result = await listModels({ baseUrl: "https://ai.example.com/v1", apiKey: "sk" })
        expect(result.models).toEqual([])
    })

    it("probes auth styles on 401", async () => {
        mockFetch
            .mockResolvedValueOnce(errorResponse(401))
            .mockResolvedValueOnce(jsonResponse({ data: [{ id: "m1" }] }))

        const result = await listModels({ baseUrl: "https://ai.example.com/v1", apiKey: "K" })

        expect(result.authStyle).toBe("raw")
        expect(result.models.map((m) => m.id)).toEqual(["m1"])
    })

    it("throws immediately on a 404 (no /models endpoint)", async () => {
        mockFetch.mockResolvedValueOnce(errorResponse(404, "not found"))

        await expect(
            listModels({ baseUrl: "https://ai.example.com/v1", apiKey: "sk" })
        ).rejects.toMatchObject({ status: 404 })

        expect(mockFetch).toHaveBeenCalledTimes(1)
    })
})

describe("openai-compatible: probeProvider", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("verifies via chat when /models is missing", async () => {
        mockFetch
            // /models -> 404
            .mockResolvedValueOnce(errorResponse(404))
            // chat/completions -> ok
            .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "ok" } }] }))

        const result = await probeProvider({
            baseUrl: "https://ai.example.com/v1",
            apiKey: "sk",
            model: "auto",
        })

        expect(result.chatVerified).toBe(true)
        expect(result.modelsEndpointAvailable).toBe(false)
        expect(result.verifiedModel).toBe("auto")
        expect(result.models).toEqual([])
    })

    it("accepts an authenticated model list even when chat fails", async () => {
        mockFetch
            .mockResolvedValueOnce(jsonResponse({ data: [{ id: "m1" }] }))
            .mockResolvedValueOnce(errorResponse(500, "model busy"))

        const result = await probeProvider({
            baseUrl: "https://ai.example.com/v1",
            apiKey: "sk",
            model: "m1",
        })

        expect(result.chatVerified).toBe(false)
        expect(result.modelsEndpointAvailable).toBe(true)
        expect(result.models.map((m) => m.id)).toEqual(["m1"])
    })

    it("propagates the failure when both probes fail", async () => {
        mockFetch
            .mockResolvedValueOnce(errorResponse(401))
            .mockResolvedValueOnce(errorResponse(401))
            .mockResolvedValueOnce(errorResponse(401))
            .mockResolvedValueOnce(errorResponse(401))
            .mockResolvedValueOnce(errorResponse(401))
            .mockResolvedValueOnce(errorResponse(401))

        await expect(
            probeProvider({ baseUrl: "https://ai.example.com/v1", apiKey: "bad", model: "auto" })
        ).rejects.toMatchObject({ status: 401 })
    })

    it("uses the first listed model when none was requested", async () => {
        mockFetch
            .mockResolvedValueOnce(jsonResponse({ data: [{ id: "first-model" }, { id: "second" }] }))
            .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "ok" } }] }))

        const result = await probeProvider({ baseUrl: "https://ai.example.com/v1", apiKey: "sk" })

        expect(result.verifiedModel).toBe("first-model")

        const chatBody = JSON.parse(String(mockFetch.mock.calls[1][1]?.body))
        expect(chatBody.model).toBe("first-model")
    })
})
