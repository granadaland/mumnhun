import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("node:dns/promises", () => ({
    lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}))

const { resolveTextGenerationTimeoutMs, shouldRetryJsonParse } = await import("@/lib/ai/provider")

describe("resolveTextGenerationTimeoutMs", () => {
    const ORIGINAL = process.env.AI_TEXT_TIMEOUT_MS

    afterEach(() => {
        if (ORIGINAL === undefined) delete process.env.AI_TEXT_TIMEOUT_MS
        else process.env.AI_TEXT_TIMEOUT_MS = ORIGINAL
    })

    it("defaults to 150s when no explicit value and no env var", () => {
        delete process.env.AI_TEXT_TIMEOUT_MS
        expect(resolveTextGenerationTimeoutMs()).toBe(150_000)
    })

    it("prefers an explicit argument over the env var", () => {
        process.env.AI_TEXT_TIMEOUT_MS = "60000"
        expect(resolveTextGenerationTimeoutMs(120_000)).toBe(120_000)
    })

    it("reads AI_TEXT_TIMEOUT_MS from the environment", () => {
        process.env.AI_TEXT_TIMEOUT_MS = "200000"
        expect(resolveTextGenerationTimeoutMs()).toBe(200_000)
    })

    it("clamps below the 30s floor and above the 280s ceiling", () => {
        expect(resolveTextGenerationTimeoutMs(5_000)).toBe(30_000)
        expect(resolveTextGenerationTimeoutMs(600_000)).toBe(280_000)

        process.env.AI_TEXT_TIMEOUT_MS = "10"
        expect(resolveTextGenerationTimeoutMs()).toBe(30_000)

        process.env.AI_TEXT_TIMEOUT_MS = "999999"
        expect(resolveTextGenerationTimeoutMs()).toBe(280_000)
    })

    it("falls back to the default for garbage input", () => {
        process.env.AI_TEXT_TIMEOUT_MS = "not-a-number"
        expect(resolveTextGenerationTimeoutMs()).toBe(150_000)
        expect(resolveTextGenerationTimeoutMs(Number.NaN)).toBe(150_000)
    })
})

describe("shouldRetryJsonParse (repair-retry budget guard)", () => {
    it("retries fast failures — usually refusals the reminder fixes", () => {
        expect(shouldRetryJsonParse(0)).toBe(true)
        expect(shouldRetryJsonParse(29_999)).toBe(true)
    })

    it("does not retry slow attempts — a second generation cannot fit the budget", () => {
        expect(shouldRetryJsonParse(30_000)).toBe(false)
        expect(shouldRetryJsonParse(240_000)).toBe(false)
    })
})
