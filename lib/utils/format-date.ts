import { INDONESIAN_MONTHS } from "@/lib/constants"

/**
 * Format date to Indonesian locale
 * Example: "30 Januari 2026"
 */
export function formatIndonesianDate(date: Date | string): string {
    const d = new Date(date)
    const day = d.getDate()
    const month = INDONESIAN_MONTHS[d.getMonth()]
    const year = d.getFullYear()

    return `${day} ${month} ${year}`
}

/**
 * Format date with time
 * Example: "30 Januari 2026, 14:30 WIB"
 */
export function formatIndonesianDateTime(date: Date | string): string {
    const d = new Date(date)
    const dateStr = formatIndonesianDate(d)
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')

    return `${dateStr}, ${hours}:${minutes} WIB`
}

/**
 * Get relative time in Indonesian
 * Example: "2 jam yang lalu", "kemarin", "3 hari yang lalu"
 */
export function formatRelativeTime(date: Date | string): string {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return "baru saja"
    if (diffMins < 60) return `${diffMins} menit yang lalu`
    if (diffHours < 24) return `${diffHours} jam yang lalu`
    if (diffDays === 1) return "kemarin"
    if (diffDays < 7) return `${diffDays} hari yang lalu`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu yang lalu`

    // For older dates, return the full date
    return formatIndonesianDate(d)
}
