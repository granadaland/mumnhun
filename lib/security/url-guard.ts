import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

export type UrlGuardErrorCode =
    | "URL_MALFORMED"
    | "URL_PROTOCOL_NOT_ALLOWED"
    | "URL_CREDENTIALS_NOT_ALLOWED"
    | "URL_HOST_BLOCKED"
    | "URL_HOST_NOT_ALLOWLISTED"
    | "URL_DNS_FAILED"
    | "URL_PRIVATE_ADDRESS_BLOCKED"
    | "URL_REDIRECT_BLOCKED"
    | "URL_RESPONSE_TOO_LARGE"

export class UrlGuardError extends Error {
    code: UrlGuardErrorCode

    constructor(message: string, code: UrlGuardErrorCode) {
        super(message)
        this.name = "UrlGuardError"
        this.code = code
    }
}

export type UrlGuardOptions = {
    /**
     * Restrict the hostname to an explicit allowlist (case-insensitive, exact match).
     * When omitted, any public hostname that survives the private-range checks is accepted.
     */
    allowedHosts?: readonly string[]
    /**
     * Permit plain http. Only intended for local development endpoints such as
     * self-hosted OpenAI-compatible gateways running on localhost.
     */
    allowHttp?: boolean
}

const BLOCKED_HOSTNAMES = new Set([
    "localhost",
    "localhost.localdomain",
    "ip6-localhost",
    "ip6-loopback",
    "metadata",
    "metadata.google.internal",
    "metadata.goog",
    "instance-data",
])

const BLOCKED_HOSTNAME_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain"]

const MAX_REDIRECTS = 3

function stripIpv6Brackets(hostname: string): string {
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
        return hostname.slice(1, -1)
    }
    return hostname
}

function parseIpv4(address: string): number[] | null {
    const parts = address.split(".")
    if (parts.length !== 4) return null

    const octets: number[] = []
    for (const part of parts) {
        if (!/^\d{1,3}$/.test(part)) return null
        const value = Number(part)
        if (value < 0 || value > 255) return null
        octets.push(value)
    }

    return octets
}

function isPrivateIpv4(address: string): boolean {
    const octets = parseIpv4(address)
    if (!octets) return true

    const [a, b] = octets

    if (a === 0) return true // 0.0.0.0/8 "this network"
    if (a === 10) return true // private
    if (a === 127) return true // loopback
    if (a === 169 && b === 254) return true // link-local incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true // private
    if (a === 192 && b === 168) return true // private
    if (a === 192 && b === 0) return true // IETF protocol assignments / 192.0.0.0/24, 192.0.2.0/24
    if (a === 198 && (b === 18 || b === 19)) return true // benchmarking
    if (a === 198 && b === 51) return true // documentation
    if (a === 203 && b === 0) return true // documentation
    if (a === 100 && b >= 64 && b <= 127) return true // carrier-grade NAT
    if (a >= 224) return true // multicast, reserved, broadcast

    return false
}

function expandIpv6(address: string): number[] | null {
    const normalized = address.split("%")[0].toLowerCase()

    const doubleColonCount = (normalized.match(/::/g) || []).length
    if (doubleColonCount > 1) return null

    const [headRaw, tailRaw] = doubleColonCount === 1 ? normalized.split("::") : [normalized, null]

    const parseGroups = (value: string): number[] | null => {
        if (!value) return []
        const groups: number[] = []
        for (const group of value.split(":")) {
            if (group === "") return null
            if (group.includes(".")) {
                const octets = parseIpv4(group)
                if (!octets) return null
                groups.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3])
                continue
            }
            if (!/^[0-9a-f]{1,4}$/.test(group)) return null
            groups.push(Number.parseInt(group, 16))
        }
        return groups
    }

    const head = parseGroups(headRaw)
    if (!head) return null

    if (tailRaw === null) {
        return head.length === 8 ? head : null
    }

    const tail = parseGroups(tailRaw)
    if (!tail) return null

    const fillLength = 8 - head.length - tail.length
    if (fillLength < 0) return null

    return [...head, ...Array.from({ length: fillLength }, () => 0), ...tail]
}

function isPrivateIpv6(address: string): boolean {
    const groups = expandIpv6(address)
    if (!groups) return true

    const isAllZero = groups.every((group) => group === 0)
    if (isAllZero) return true // ::

    const isLoopback = groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1
    if (isLoopback) return true // ::1

    // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d) must be re-checked as IPv4.
    const hasIpv4Embedded = groups.slice(0, 5).every((group) => group === 0) && (groups[5] === 0xffff || groups[5] === 0)
    if (hasIpv4Embedded) {
        const embedded = [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff].join(".")
        return isPrivateIpv4(embedded)
    }

    const first = groups[0]

    if ((first & 0xfe00) === 0xfc00) return true // fc00::/7 unique-local
    if ((first & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
    if ((first & 0xff00) === 0xff00) return true // ff00::/8 multicast
    if (first === 0x2001 && groups[1] === 0x0db8) return true // 2001:db8::/32 documentation
    if (first === 0x0064 && groups[1] === 0xff9b) return true // 64:ff9b::/96 NAT64

    return false
}

export function isPrivateOrReservedIp(address: string): boolean {
    const normalized = stripIpv6Brackets(address.trim())
    const family = isIP(normalized)

    if (family === 4) return isPrivateIpv4(normalized)
    if (family === 6) return isPrivateIpv6(normalized)

    return true
}

export function isBlockedHostname(hostname: string): boolean {
    const normalized = stripIpv6Brackets(hostname.trim().toLowerCase()).replace(/\.$/, "")

    if (!normalized) return true
    if (BLOCKED_HOSTNAMES.has(normalized)) return true

    return BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
}

/**
 * Reads the optional operator allowlist for custom AI providers. When set, only these hosts
 * may be configured as a custom OpenAI-compatible base URL.
 */
export function getAiProviderGuardOptions(): UrlGuardOptions {
    const rawAllowedHosts = process.env.AI_PROVIDER_ALLOWED_HOSTS?.trim()
    const allowHttp = process.env.AI_PROVIDER_ALLOW_HTTP === "true" && process.env.NODE_ENV !== "production"

    if (!rawAllowedHosts) {
        return { allowHttp }
    }

    const allowedHosts = rawAllowedHosts
        .split(",")
        .map((host) => host.trim())
        .filter(Boolean)

    return allowedHosts.length > 0 ? { allowedHosts, allowHttp } : { allowHttp }
}

function normalizeAllowedHosts(allowedHosts: readonly string[] | undefined): Set<string> | null {
    if (!allowedHosts || allowedHosts.length === 0) return null

    return new Set(
        allowedHosts
            .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
            .filter(Boolean)
    )
}

async function resolveHostAddresses(hostname: string): Promise<string[]> {
    const normalized = stripIpv6Brackets(hostname)

    if (isIP(normalized)) {
        return [normalized]
    }

    try {
        const records = await lookup(normalized, { all: true, verbatim: true })
        return records.map((record) => record.address)
    } catch {
        throw new UrlGuardError(`Hostname tidak dapat di-resolve: ${normalized}`, "URL_DNS_FAILED")
    }
}

export type SafeUrl = {
    url: URL
    addresses: string[]
}

/**
 * Validates an operator-supplied URL before the server performs any outbound request to it.
 * Rejects non-https, embedded credentials, internal hostnames, and any hostname whose DNS
 * records point at private, loopback, link-local, or otherwise reserved address space.
 */
export async function assertSafeExternalUrl(rawUrl: string, options: UrlGuardOptions = {}): Promise<SafeUrl> {
    const trimmed = typeof rawUrl === "string" ? rawUrl.trim() : ""
    if (!trimmed) {
        throw new UrlGuardError("URL wajib diisi", "URL_MALFORMED")
    }

    let url: URL
    try {
        url = new URL(trimmed)
    } catch {
        throw new UrlGuardError("URL tidak valid (harus absolut, contoh: https://api.example.com/v1)", "URL_MALFORMED")
    }

    const isHttps = url.protocol === "https:"
    const isHttp = url.protocol === "http:"

    if (!isHttps && !(isHttp && options.allowHttp === true)) {
        throw new UrlGuardError("URL harus menggunakan protokol https", "URL_PROTOCOL_NOT_ALLOWED")
    }

    if (url.username || url.password) {
        throw new UrlGuardError("URL tidak boleh memuat kredensial (user:password)", "URL_CREDENTIALS_NOT_ALLOWED")
    }

    const hostname = url.hostname.toLowerCase()

    const allowedHosts = normalizeAllowedHosts(options.allowedHosts)
    if (allowedHosts && !allowedHosts.has(stripIpv6Brackets(hostname).replace(/\.$/, ""))) {
        throw new UrlGuardError(`Host tidak ada dalam daftar yang diizinkan: ${hostname}`, "URL_HOST_NOT_ALLOWLISTED")
    }

    if (isBlockedHostname(hostname)) {
        throw new UrlGuardError(`Host tidak diizinkan: ${hostname}`, "URL_HOST_BLOCKED")
    }

    const addresses = await resolveHostAddresses(hostname)
    if (addresses.length === 0) {
        throw new UrlGuardError(`Hostname tidak dapat di-resolve: ${hostname}`, "URL_DNS_FAILED")
    }

    for (const address of addresses) {
        if (isPrivateOrReservedIp(address)) {
            throw new UrlGuardError(
                `Host mengarah ke alamat internal yang diblokir: ${hostname}`,
                "URL_PRIVATE_ADDRESS_BLOCKED"
            )
        }
    }

    return { url, addresses }
}

/**
 * Normalizes an OpenAI-compatible base URL: validated, trailing slash removed.
 */
export async function assertSafeProviderBaseUrl(rawUrl: string, options: UrlGuardOptions = {}): Promise<string> {
    const { url } = await assertSafeExternalUrl(rawUrl, options)
    const normalizedPath = url.pathname.replace(/\/+$/, "")

    return `${url.origin}${normalizedPath}${url.search}`
}

export type SafeFetchOptions = RequestInit & {
    guard?: UrlGuardOptions
    timeoutMs?: number
}

/**
 * Fetch wrapper that re-validates every redirect hop, so a validated host cannot bounce
 * the request into internal address space. Sensitive request headers (Authorization,
 * Cookie) are dropped on cross-origin redirects so a redirect cannot leak the API key
 * to a different host.
 */
export async function safeExternalFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<Response> {
    const { guard, timeoutMs = 15_000, ...init } = options

    const controller = new AbortController()
    const externalSignal = init.signal
    const onExternalAbort = () => controller.abort()
    // Distinguishes our own deadline from a caller-initiated abort, so the error can say
    // which budget ran out instead of surfacing as a bare "This operation was aborted".
    let timedOut = false

    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort()
        } else {
            externalSignal.addEventListener("abort", onExternalAbort, { once: true })
        }
    }

    const timeoutHandle = setTimeout(() => {
        timedOut = true
        controller.abort()
    }, timeoutMs)

    try {
        let currentUrl = rawUrl
        let headers = new Headers(init.headers)
        let previousOrigin: string | null = null

        for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
            const validated = await assertSafeExternalUrl(currentUrl, guard)

            if (previousOrigin && validated.url.origin !== previousOrigin) {
                headers = new Headers(headers)
                headers.delete("authorization")
                headers.delete("cookie")
            }
            previousOrigin = validated.url.origin

            try {
                const response = await fetch(validated.url, {
                    ...init,
                    headers,
                    redirect: "manual",
                    signal: controller.signal,
                })

                const isRedirect = response.status >= 300 && response.status < 400
                if (!isRedirect) {
                    return response
                }

                const location = response.headers.get("location")
                if (!location) {
                    return response
                }

                currentUrl = new URL(location, validated.url).toString()
            } catch (error) {
                if (timedOut && error instanceof Error && error.name === "AbortError") {
                    // Keep the AbortError name — callers classify it as NETWORK_TIMEOUT — but
                    // carry the configured budget so the message is diagnosable.
                    throw Object.assign(
                        new Error(`Provider tidak merespons dalam ${timeoutMs} ms (timeout)`) as Error & { name: string },
                        { name: "AbortError" }
                    )
                }
                throw error
            }
        }

        throw new UrlGuardError("Terlalu banyak redirect saat mengambil resource eksternal", "URL_REDIRECT_BLOCKED")
    } finally {
        clearTimeout(timeoutHandle)
        if (externalSignal) {
            externalSignal.removeEventListener("abort", onExternalAbort)
        }
    }
}

/**
 * Reads a response body while enforcing a hard byte ceiling, so a hostile or misconfigured
 * remote cannot exhaust memory during image ingestion.
 */
export async function readResponseWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
    const declaredLength = Number(response.headers.get("content-length") || "")
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        throw new UrlGuardError("Ukuran file melebihi batas yang diizinkan", "URL_RESPONSE_TOO_LARGE")
    }

    if (!response.body) {
        const buffer = Buffer.from(await response.arrayBuffer())
        if (buffer.byteLength > maxBytes) {
            throw new UrlGuardError("Ukuran file melebihi batas yang diizinkan", "URL_RESPONSE_TOO_LARGE")
        }
        return buffer
    }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0

    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (!value) continue

            total += value.byteLength
            if (total > maxBytes) {
                throw new UrlGuardError("Ukuran file melebihi batas yang diizinkan", "URL_RESPONSE_TOO_LARGE")
            }

            chunks.push(value)
        }
    } finally {
        reader.releaseLock()
    }

    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
}
