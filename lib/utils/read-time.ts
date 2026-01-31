import { WORDS_PER_MINUTE } from "@/lib/constants"

/**
 * Calculate reading time from HTML content
 * Returns estimated minutes to read
 */
export function calculateReadTime(htmlContent: string): number {
    // Remove HTML tags
    const text = htmlContent.replace(/<[^>]*>/g, '')

    // Count words (split by whitespace)
    const words = text.trim().split(/\s+/).filter(Boolean).length

    // Calculate read time (minimum 1 minute)
    const minutes = Math.ceil(words / WORDS_PER_MINUTE)

    return Math.max(1, minutes)
}

/**
 * Get word count from HTML content
 */
export function getWordCount(htmlContent: string): number {
    const text = htmlContent.replace(/<[^>]*>/g, '')
    return text.trim().split(/\s+/).filter(Boolean).length
}
