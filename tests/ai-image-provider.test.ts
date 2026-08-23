import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:dns/promises", () => ({
    lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}))

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const { generateImageWithProvider } = await import("@/lib/ai/provider")
const { ImageGenerationUnsupportedError } = await import("@/lib/ai/openai-compatible")

const PNG_BASE64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString("base64")

function imageOk(): Response {
    return new Response(JSON.stringify({ data: [{ b64_json: PNG_BASE64 }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
    })
}

function httpError(status: number, body = "err"): Response {
    return new Response(body, { status, headers: { "content-type": "text/plain" } })
}

const config = {
    provider: "openai_compatible",
    apiKey: "sk-test",
    baseUrl: "https://ai.example.com/v1",
    model: "gpt-image-1",
    authStyle: "bearer" as const,
}

function urlOfCall(index: number): string {
    return String(mockFetch.mock.calls[index][0])
}

function bodyOfCall(index: number): Record<string, unknown> {
    return JSON.parse(String(mockFetch.mock.calls[index][1]?.body))
}

describe("generateImageWithProvider: endpoint tolerance", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("uses the OpenAI path when it works", async () => {
        mockFetch.mockResolvedValueOnce(imageOk())

        const result = await generateImageWithProvider(config, "prompt", { maxBytes: 1_000_000 })

        expect(result.mimeType).toBe("image/png")
        expect(urlOfCall(0)).toBe("https://ai.example.com/v1/images/generations")
    })

    it("falls back to /images/generate when the OpenAI path 404s", async () => {
        mockFetch
            .mockResolvedValueOnce(httpError(404, '{"error":"Not found"}'))
            .mockResolvedValueOnce(imageOk())

        const result = await generateImageWithProvider(config, "prompt", { maxBytes: 1_000_000 })

        expect(result.mimeType).toBe("image/png")
        expect(urlOfCall(0)).toContain("/images/generations")
        expect(urlOfCall(1)).toContain("/images/generate")
    })

    it("retries without size when the gateway rejects that field", async () => {
        mockFetch
            .mockResolvedValueOnce(httpError(400, "size not supported"))
            .mockResolvedValueOnce(imageOk())

        await generateImageWithProvider(config, "prompt", { maxBytes: 1_000_000 })

        // Default aspect ratio is 16:9, mapped onto OpenAI-style dimensions.
        expect(bodyOfCall(0).size).toBe("1792x1024")
        expect(bodyOfCall(1).size).toBeUndefined()
    })

    it("maps the 4:3 ratio onto OpenAI-style dimensions", async () => {
        mockFetch.mockResolvedValueOnce(imageOk())

        await generateImageWithProvider(
            { ...config, provider: "openai_compatible" } as typeof config,
            "prompt",
            { maxBytes: 1_000_000, aspectRatio: "4:3" }
        )

        expect(bodyOfCall(0).size).toBe("1408x1056")
    })

    it("throws ImageGenerationUnsupportedError when every path 404s", async () => {
        mockFetch.mockResolvedValue(httpError(404, '{"error":"Not found"}'))

        await expect(
            generateImageWithProvider(config, "prompt", { maxBytes: 1_000_000 })
        ).rejects.toBeInstanceOf(ImageGenerationUnsupportedError)
    })

    it("mentions the model and the attempted paths in the unsupported error", async () => {
        mockFetch.mockResolvedValue(httpError(404, '{"error":"Not found"}'))

        try {
            await generateImageWithProvider({ ...config, model: "kimi-k3" }, "prompt", {
                maxBytes: 1_000_000,
            })
            throw new Error("expected rejection")
        } catch (error) {
            expect(error).toBeInstanceOf(ImageGenerationUnsupportedError)
            const message = (error as InstanceType<typeof ImageGenerationUnsupportedError>).message
            expect(message).toContain("kimi-k3")
            expect(message).toContain("/images/generations")
        }
    })

    it("probes another auth style when the credential is rejected", async () => {
        mockFetch
            .mockResolvedValueOnce(httpError(401))
            .mockResolvedValueOnce(imageOk())

        const result = await generateImageWithProvider(config, "prompt", { maxBytes: 1_000_000 })

        expect(result.mimeType).toBe("image/png")

        const firstHeaders = new Headers(mockFetch.mock.calls[0][1]?.headers)
        const secondHeaders = new Headers(mockFetch.mock.calls[1][1]?.headers)
        expect(firstHeaders.get("authorization")).toBe("Bearer sk-test")
        expect(secondHeaders.get("authorization")).toBe("sk-test")
    })

    it("does not swallow a server error as unsupported", async () => {
        mockFetch.mockResolvedValueOnce(httpError(500, "boom"))

        await expect(
            generateImageWithProvider(config, "prompt", { maxBytes: 1_000_000 })
        ).rejects.not.toBeInstanceOf(ImageGenerationUnsupportedError)
    })

    it("rejects an oversized image", async () => {
        const bigBase64 = Buffer.alloc(2000, 1).toString("base64")
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ data: [{ b64_json: bigBase64 }] }), {
                status: 200,
                headers: { "content-type": "application/json" },
            })
        )

        await expect(
            generateImageWithProvider(config, "prompt", { maxBytes: 1000 })
        ).rejects.toThrow(/melebihi batas/i)
    })

    it("fetches a remote URL result through the guard", async () => {
        mockFetch
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ data: [{ url: "https://cdn.example.com/img.png" }] }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                })
            )
            .mockResolvedValueOnce(
                new Response(Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
                    status: 200,
                    headers: { "content-type": "image/png" },
                })
            )

        const result = await generateImageWithProvider(config, "prompt", { maxBytes: 1_000_000 })

        expect(result.mimeType).toBe("image/png")
        expect(urlOfCall(1)).toBe("https://cdn.example.com/img.png")
    })
})
