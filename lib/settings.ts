import prisma from "@/lib/db/prisma"
import { revalidateTag, unstable_cache } from "next/cache"

// Settings cache tag for revalidation
export const SETTINGS_CACHE_TAG = "site-settings"

/**
 * Get a single setting by key (cached)
 */
export const getSetting = unstable_cache(
    async (key: string): Promise<string | null> => {
        const setting = await prisma.siteSetting.findUnique({
            where: { key },
        })
        return setting?.value ?? null
    },
    ["site-setting"],
    { tags: [SETTINGS_CACHE_TAG], revalidate: 60 }
)

/**
 * Get all settings in a group (cached)
 */
export const getSettingsByGroup = unstable_cache(
    async (group: string): Promise<Record<string, string>> => {
        const settings = await prisma.siteSetting.findMany({
            where: { group },
        })
        return Object.fromEntries(settings.map((s) => [s.key, s.value]))
    },
    ["site-settings-group"],
    { tags: [SETTINGS_CACHE_TAG], revalidate: 60 }
)

/**
 * Get all settings (cached)
 */
export const getAllSettings = unstable_cache(
    async (): Promise<Record<string, string>> => {
        const settings = await prisma.siteSetting.findMany()
        return Object.fromEntries(settings.map((s) => [s.key, s.value]))
    },
    ["all-site-settings"],
    { tags: [SETTINGS_CACHE_TAG], revalidate: 60 }
)

/**
 * Get parsed JSON setting (cached)
 */
export async function getJsonSetting<T>(key: string): Promise<T | null> {
    const value = await getSetting(key)
    if (!value) return null
    try {
        return JSON.parse(value) as T
    } catch {
        return null
    }
}

/**
 * Update a setting (server action — invalidates cache)
 */
export async function updateSetting(key: string, value: string, options?: { group?: string }) {
    const result = await prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value, group: options?.group || "general" },
    })
    revalidateTag(SETTINGS_CACHE_TAG, "max")
    return result
}

/**
 * Update multiple settings at once
 */
export async function updateSettings(settings: Record<string, string>, options?: { group?: string }) {
    const group = options?.group || "general"

    const promises = Object.entries(settings).map(([key, value]) =>
        prisma.siteSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value, group },
        })
    )

    const results = await Promise.all(promises)
    revalidateTag(SETTINGS_CACHE_TAG, "max")
    return results
}
