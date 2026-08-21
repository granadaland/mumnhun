import { afterEach, describe, expect, it, vi } from "vitest"

const mockLookup = vi.fn()

vi.mock("node:dns/promises", () => ({
    lookup: mockLookup,
}))

const {
    UrlGuardError,
    assertSafeExternalUrl,
    assertSafeProviderBaseUrl,
    getAiProviderGuardOptions,
    isBlockedHostname,
    isPrivateOrReservedIp,
    readResponseWithLimit,
    safeExternalFetch,
} = await import("@/lib/security/url-guard")

function mockPublicDns(address = "93.184.216.34") {
    mockLookup.mockResolvedValue([{ address, family: address.includes(":") ? 6 : 4 }])
}

describe("url-guard: private/reserved IP detection", () => {
    it.each([
        ["127.0.0.1", true],
        ["10.1.2.3", true],
        ["172.16.0.1", true],
        ["172.31.255.255", true],
        ["172.32.0.1", false],
        ["192.168.1.1", true],
        ["169.254.169.254", true],
        ["100.64.0.1", true],
        ["0.0.0.0", true],
        ["224.0.0.1", true],
        ["8.8.8.8", false],
        ["93.184.216.34", false],
    ])("IPv4 %s -> private=%s", (address, expected) => {
        expect(isPrivateOrReservedIp(address)).toBe(expected)
    })

    it.each([
        ["::1", true],
        ["::", true],
        ["fc00::1", true],
        ["fd12:3456::1", true],
        ["fe80::1", true],
        ["ff02::1", true],
        ["::ffff:127.0.0.1", true],
        ["::ffff:8.8.8.8", false],
        ["2001:db8::1", true],
        ["2606:4700:4700::1111", false],
    ])("IPv6 %s -> private=%s", (address, expected) => {
        expect(isPrivateOrReservedIp(address)).toBe(expected)
    })

    it("treats malformed addresses as unsafe", () => {
        expect(isPrivateOrReservedIp("not-an-ip")).toBe(true)
        expect(isPrivateOrReservedIp("999.999.999.999")).toBe(true)
    })
})

describe("url-guard: hostname blocklist", () => {
    it.each([
        ["localhost", true],
        ["metadata.google.internal", true],
        ["api.internal", true],
        ["service.local", true],
        ["foo.localhost", true],
        ["api.openai.com", false],
        ["openrouter.ai", false],
    ])("hostname %s -> blocked=%s", (hostname, expected) => {
        expect(isBlockedHostname(hostname)).toBe(expected)
    })
})

describe("url-guard: assertSafeExternalUrl", () => {
    it("rejects non-absolute and malformed URLs", async () => {
        await expect(assertSafeExternalUrl("")).rejects.toMatchObject({ code: "URL_MALFORMED" })
        await expect(assertSafeExternalUrl("/v1/chat")).rejects.toMatchObject({ code: "URL_MALFORMED" })
    })

    it("rejects http by default and allows it only when explicitly permitted", async () => {
        mockPublicDns()

        await expect(assertSafeExternalUrl("http://api.example.com/v1")).rejects.toMatchObject({
            code: "URL_PROTOCOL_NOT_ALLOWED",
        })

        const allowed = await assertSafeExternalUrl("http://api.example.com/v1", { allowHttp: true })
        expect(allowed.url.protocol).toBe("http:")
    })

    it("rejects embedded credentials", async () => {
        mockPublicDns()

        await expect(assertSafeExternalUrl("https://user:pass@api.example.com/v1")).rejects.toMatchObject({
            code: "URL_CREDENTIALS_NOT_ALLOWED",
        })
    })

    it("rejects internal hostnames before DNS resolution", async () => {
        mockLookup.mockReset()

        await expect(assertSafeExternalUrl("https://metadata.google.internal/v1")).rejects.toMatchObject({
            code: "URL_HOST_BLOCKED",
        })
        expect(mockLookup).not.toHaveBeenCalled()
    })

    it("rejects hostnames that resolve to private address space", async () => {
        mockLookup.mockResolvedValue([{ address: "169.254.169.254", family: 4 }])

        await expect(assertSafeExternalUrl("https://evil.example.com/v1")).rejects.toMatchObject({
            code: "URL_PRIVATE_ADDRESS_BLOCKED",
        })
    })

    it("rejects when any resolved address is private (mixed A records)", async () => {
        mockLookup.mockResolvedValue([
            { address: "93.184.216.34", family: 4 },
            { address: "127.0.0.1", family: 4 },
        ])

        await expect(assertSafeExternalUrl("https://mixed.example.com/v1")).rejects.toMatchObject({
            code: "URL_PRIVATE_ADDRESS_BLOCKED",
        })
    })

    it("surfaces DNS failures as a dedicated code", async () => {
        mockLookup.mockRejectedValue(new Error("ENOTFOUND"))

        await expect(assertSafeExternalUrl("https://missing.example.com/v1")).rejects.toMatchObject({
            code: "URL_DNS_FAILED",
        })
    })

    it("enforces the host allowlist when configured", async () => {
        mockPublicDns()

        await expect(
            assertSafeExternalUrl("https://api.other.com/v1", { allowedHosts: ["api.openai.com"] })
        ).rejects.toMatchObject({ code: "URL_HOST_NOT_ALLOWLISTED" })

        const allowed = await assertSafeExternalUrl("https://api.openai.com/v1", {
            allowedHosts: ["api.openai.com"],
        })
        expect(allowed.url.hostname).toBe("api.openai.com")
    })

    it("accepts a literal public IP without DNS lookup", async () => {
        mockLookup.mockReset()

        const result = await assertSafeExternalUrl("https://93.184.216.34/v1")
        expect(result.addresses).toEqual(["93.184.216.34"])
        expect(mockLookup).not.toHaveBeenCalled()
    })

    it("rejects a literal private IP", async () => {
        await expect(assertSafeExternalUrl("https://127.0.0.1/v1")).rejects.toMatchObject({
            code: "URL_PRIVATE_ADDRESS_BLOCKED",
        })
    })
})

describe("url-guard: assertSafeProviderBaseUrl", () => {
    it("normalizes trailing slashes while preserving the path", async () => {
        mockPublicDns()

        await expect(assertSafeProviderBaseUrl("https://api.openai.com/v1/")).resolves.toBe(
            "https://api.openai.com/v1"
        )
        await expect(assertSafeProviderBaseUrl("https://openrouter.ai/api/v1///")).resolves.toBe(
            "https://openrouter.ai/api/v1"
        )
        await expect(assertSafeProviderBaseUrl("https://api.example.com")).resolves.toBe(
            "https://api.example.com"
        )
    })

    it("propagates guard errors", async () => {
        mockLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }])

        await expect(assertSafeProviderBaseUrl("https://internal.example.com/v1")).rejects.toBeInstanceOf(
            UrlGuardError
        )
    })
})

describe("url-guard: getAiProviderGuardOptions", () => {
    it("returns no allowlist by default", () => {
        delete process.env.AI_PROVIDER_ALLOWED_HOSTS
        delete process.env.AI_PROVIDER_ALLOW_HTTP

        expect(getAiProviderGuardOptions()).toEqual({ allowHttp: false })
    })

    it("parses the comma-separated allowlist", () => {
        process.env.AI_PROVIDER_ALLOWED_HOSTS = " api.openai.com , openrouter.ai "

        expect(getAiProviderGuardOptions()).toEqual({
            allowedHosts: ["api.openai.com", "openrouter.ai"],
            allowHttp: false,
        })

        delete process.env.AI_PROVIDER_ALLOWED_HOSTS
    })
})

describe("url-guard: readResponseWithLimit", () => {
    it("rejects when content-length exceeds the ceiling", async () => {
        const response = new Response("payload", {
            headers: { "content-length": "5000" },
        })

        await expect(readResponseWithLimit(response, 1000)).rejects.toMatchObject({
            code: "URL_RESPONSE_TOO_LARGE",
        })
    })

    it("rejects when the streamed body exceeds the ceiling", async () => {
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new Uint8Array(600))
                controller.enqueue(new Uint8Array(600))
                controller.close()
            },
        })

        const response = new Response(body)

        await expect(readResponseWithLimit(response, 1000)).rejects.toMatchObject({
            code: "URL_RESPONSE_TOO_LARGE",
        })
    })

    it("returns the full buffer when within the ceiling", async () => {
        const response = new Response(new Uint8Array([1, 2, 3, 4]))
        const buffer = await readResponseWithLimit(response, 1000)

        expect(buffer.byteLength).toBe(4)
        expect([...buffer]).toEqual([1, 2, 3, 4])
    })
})

describe("url-guard: safeExternalFetch redirect handling", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("drops Authorization on cross-origin redirects", async () => {
        mockPublicDns()

        const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
            const url = input instanceof URL ? input : new URL(String(input))
            const headers = new Headers(init?.headers)

            if (url.hostname === "api.example.com") {
                return new Response(null, {
                    status: 302,
                    headers: { location: "https://cdn.other.com/asset" },
                })
            }

            // On the second hop the Authorization header must be gone.
            return new Response(headers.has("authorization") ? "LEAKED" : "OK", { status: 200 })
        })

        vi.stubGlobal("fetch", fetchMock)

        const response = await safeExternalFetch("https://api.example.com/v1/resource", {
            headers: { Authorization: "Bearer sk-secret-token-123" },
        })

        await expect(response.text()).resolves.toBe("OK")
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it("keeps Authorization on same-origin redirects", async () => {
        mockPublicDns()

        const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
            const url = input instanceof URL ? input : new URL(String(input))
            const headers = new Headers(init?.headers)

            if (url.pathname === "/v1/resource") {
                return new Response(null, {
                    status: 307,
                    headers: { location: "https://api.example.com/v1/resource-final" },
                })
            }

            return new Response(headers.get("authorization") === "Bearer keep-me" ? "OK" : "MISSING", {
                status: 200,
            })
        })

        vi.stubGlobal("fetch", fetchMock)

        const response = await safeExternalFetch("https://api.example.com/v1/resource", {
            headers: { Authorization: "Bearer keep-me" },
        })

        await expect(response.text()).resolves.toBe("OK")
    })

    it("re-validates redirect targets and blocks internal hosts", async () => {
        mockLookup.mockImplementation(async (hostname: string) => {
            if (hostname === "api.example.com") return [{ address: "93.184.216.34", family: 4 }]
            return [{ address: "169.254.169.254", family: 4 }]
        })

        const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
            const url = input instanceof URL ? input : new URL(String(input))
            if (url.hostname === "api.example.com") {
                return new Response(null, {
                    status: 302,
                    headers: { location: "https://metadata-proxy.example.net/latest" },
                })
            }
            return new Response("SHOULD NOT REACH", { status: 200 })
        })

        vi.stubGlobal("fetch", fetchMock)

        await expect(safeExternalFetch("https://api.example.com/v1/resource")).rejects.toMatchObject({
            code: "URL_PRIVATE_ADDRESS_BLOCKED",
        })
    })
})
