import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("node:dns/promises", () => ({
    lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}))

const { safeExternalFetch } = await import("@/lib/security/url-guard")

describe("safeExternalFetch: timeout diagnostics", () => {
    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    it("reports the configured budget when our deadline aborts the request", async () => {
        vi.useFakeTimers()

        // A gateway that never responds but honours the abort signal (as real fetch does).
        vi.stubGlobal(
            "fetch",
            vi.fn(
                (_url: unknown, init?: RequestInit) =>
                    new Promise<Response>((_resolve, reject) => {
                        init?.signal?.addEventListener("abort", () => {
                            const abortError = new Error("This operation was aborted")
                            abortError.name = "AbortError"
                            reject(abortError)
                        })
                    })
            )
        )

        const pending = safeExternalFetch("https://api.example.com/v1/resource", { timeoutMs: 15_000 })

        const expectation = expect(pending).rejects.toMatchObject({
            name: "AbortError",
            message: expect.stringContaining("15000 ms"),
        })

        await vi.advanceTimersByTimeAsync(15_001)
        await expectation
    })
})
