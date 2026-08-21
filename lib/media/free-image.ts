import { getSetting } from "@/lib/settings"
import { safeExternalFetch } from "@/lib/security/url-guard"

export const FREE_IMAGE_PROVIDERS = ["unsplash", "pexels"] as const
export type FreeImageProvider = (typeof FREE_IMAGE_PROVIDERS)[number]

export const FREE_IMAGE_ALLOWED_HOSTS: Record<FreeImageProvider, readonly string[]> = {
    unsplash: ["images.unsplash.com", "plus.unsplash.com"],
    pexels: ["images.pexels.com"],
}

export class FreeImageError extends Error {
    code: "PROVIDER_NOT_CONFIGURED" | "PROVIDER_REQUEST_FAILED" | "PROVIDER_KEY_INVALID" | "PROVIDER_RATE_LIMITED"

    constructor(message: string, code: FreeImageError["code"]) {
        super(message)
        this.name = "FreeImageError"
        this.code = code
    }
}

export type FreeImageCandidate = {
    provider: FreeImageProvider
    id: string
    previewUrl: string
    downloadUrl: string
    width: number | null
    height: number | null
    alt: string | null
    attribution: string
    attributionUrl: string | null
}

type UnsplashSearchResponse = {
    results?: Array<{
        id?: string
        alt_description?: string | null
        description?: string | null
        width?: number
        height?: number
        urls?: { small?: string; regular?: string; raw?: string }
        links?: { html?: string }
        user?: { name?: string; links?: { html?: string } }
    }>
}

type PexelsSearchResponse = {
    photos?: Array<{
        id?: number
        alt?: string | null
        width?: number
        height?: number
        url?: string
        src?: { medium?: string; large?: string; large2x?: string }
        photographer?: string
        photographer_url?: string
    }>
}

/**
 * Resolves the provider API key from environment first, then site settings, so operators
 * can configure it either at deploy time or from the dashboard.
 */
async function resolveProviderKey(provider: FreeImageProvider): Promise<string> {
    const envKey =
        provider === "unsplash"
            ? process.env.UNSPLASH_ACCESS_KEY?.trim()
            : process.env.PEXELS_API_KEY?.trim()

    if (envKey) return envKey

    const settingKey = provider === "unsplash" ? "unsplash_access_key" : "pexels_api_key"
    const settingValue = (await getSetting(settingKey))?.trim()

    if (settingValue) return settingValue

    throw new FreeImageError(
        `API key provider ${provider} belum dikonfigurasi`,
        "PROVIDER_NOT_CONFIGURED"
    )
}

function assertProviderResponseOk(provider: FreeImageProvider, status: number): void {
    if (status === 401 || status === 403) {
        throw new FreeImageError(`API key provider ${provider} tidak valid`, "PROVIDER_KEY_INVALID")
    }

    if (status === 429) {
        throw new FreeImageError(`Provider ${provider} terkena rate limit`, "PROVIDER_RATE_LIMITED")
    }

    throw new FreeImageError(
        `Permintaan ke provider ${provider} gagal (HTTP ${status})`,
        "PROVIDER_REQUEST_FAILED"
    )
}

async function searchUnsplash(query: string, perPage: number): Promise<FreeImageCandidate[]> {
    const accessKey = await resolveProviderKey("unsplash")
    const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`

    const response = await safeExternalFetch(endpoint, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Accept-Version": "v1",
            Authorization: `Client-ID ${accessKey}`,
        },
        cache: "no-store",
        timeoutMs: 15_000,
    })

    if (!response.ok) {
        assertProviderResponseOk("unsplash", response.status)
    }

    const payload = (await response.json()) as UnsplashSearchResponse

    return (payload.results || []).flatMap<FreeImageCandidate>((item) => {
        const downloadUrl = item.urls?.regular || item.urls?.raw
        const previewUrl = item.urls?.small || downloadUrl

        if (!item.id || !downloadUrl || !previewUrl) return []

        const photographer = item.user?.name?.trim() || "Unsplash contributor"

        return [
            {
                provider: "unsplash",
                id: item.id,
                previewUrl,
                downloadUrl,
                width: item.width ?? null,
                height: item.height ?? null,
                alt: item.alt_description?.trim() || item.description?.trim() || null,
                attribution: `Foto oleh ${photographer} di Unsplash`,
                attributionUrl: item.user?.links?.html || item.links?.html || null,
            },
        ]
    })
}

async function searchPexels(query: string, perPage: number): Promise<FreeImageCandidate[]> {
    const apiKey = await resolveProviderKey("pexels")
    const endpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`

    const response = await safeExternalFetch(endpoint, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: apiKey,
        },
        cache: "no-store",
        timeoutMs: 15_000,
    })

    if (!response.ok) {
        assertProviderResponseOk("pexels", response.status)
    }

    const payload = (await response.json()) as PexelsSearchResponse

    return (payload.photos || []).flatMap<FreeImageCandidate>((item) => {
        const downloadUrl = item.src?.large2x || item.src?.large
        const previewUrl = item.src?.medium || downloadUrl

        if (typeof item.id !== "number" || !downloadUrl || !previewUrl) return []

        const photographer = item.photographer?.trim() || "Pexels contributor"

        return [
            {
                provider: "pexels",
                id: String(item.id),
                previewUrl,
                downloadUrl,
                width: item.width ?? null,
                height: item.height ?? null,
                alt: item.alt?.trim() || null,
                attribution: `Foto oleh ${photographer} di Pexels`,
                attributionUrl: item.photographer_url || item.url || null,
            },
        ]
    })
}

export async function searchFreeImages(input: {
    provider: FreeImageProvider
    query: string
    perPage?: number
}): Promise<FreeImageCandidate[]> {
    const perPage = Math.max(1, Math.min(input.perPage ?? 12, 30))

    if (input.provider === "pexels") {
        return searchPexels(input.query, perPage)
    }

    return searchUnsplash(input.query, perPage)
}
