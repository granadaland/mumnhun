// WordPress Export Types
// Based on WordPress JSON export structure

export interface WordPressPost {
    ID: number
    post_author: string
    post_date: string          // "2024-01-15 10:30:00"
    post_date_gmt: string
    post_content: string       // HTML content
    post_title: string
    post_excerpt: string
    post_status: 'publish' | 'draft' | 'pending' | 'private'
    comment_status: 'open' | 'closed'
    ping_status: 'open' | 'closed'
    post_password: string
    post_name: string          // slug - CRITICAL for SEO
    to_ping: string
    pinged: string
    post_modified: string
    post_modified_gmt: string
    post_content_filtered: string
    post_parent: number
    guid: string               // Original WordPress URL
    menu_order: number
    post_type: 'post' | 'page' | 'attachment'
    post_mime_type: string
    comment_count: string

    // Extended fields from export
    categories?: WordPressCategory[]
    tags?: WordPressTag[]
    featured_image?: string    // URL to featured image
    meta?: Record<string, string>
}

export interface WordPressCategory {
    term_id: number
    name: string               // "Kehamilan", "Bayi", etc.
    slug: string               // "kehamilan", "bayi"
    term_group: number
    term_taxonomy_id: number
    taxonomy: 'category'
    description: string
    parent: number
    count: number
}

export interface WordPressTag {
    term_id: number
    name: string
    slug: string
    term_group: number
    term_taxonomy_id: number
    taxonomy: 'post_tag'
    description: string
    parent: number
    count: number
}

export interface WordPressMedia {
    ID: number
    post_title: string         // Alt text or title
    post_name: string          // Filename slug
    post_mime_type: string     // "image/jpeg", "image/png"
    guid: string               // Original URL
    post_date: string

    // Attachment metadata
    meta?: {
        width?: number
        height?: number
        file?: string            // Relative path: "2024/01/image.jpg"
        sizes?: Record<string, {
            file: string
            width: number
            height: number
            mime_type: string
        }>
    }
}

export interface WordPressExport {
    posts: WordPressPost[]
    pages: WordPressPost[]      // Pages are also post_type
    categories: WordPressCategory[]
    tags: WordPressTag[]
    media: WordPressMedia[]
}

// Import result types
export interface ImportResult {
    success: boolean
    imported: number
    skipped: number
    errors: ImportError[]
}

export interface ImportError {
    item: string
    error: string
    wpId?: number
}
