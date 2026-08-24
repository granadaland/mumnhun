import sanitizeHtml, { type IOptions } from 'sanitize-html'

const SANITIZE_OPTIONS: IOptions = {
    allowedTags: [
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'p',
        'br',
        'ul',
        'ol',
        'li',
        'a',
        'strong',
        'em',
        'b',
        'i',
        'u',
        'blockquote',
        'code',
        'pre',
        'hr',
        'figure',
        'figcaption',
        'img',
        // Tables: AI-generated articles frequently use them for comparisons and price
        // lists, and the admin editor can now insert them. `style` stays disallowed
        // (parseStyleAttributes: false), so layout comes from CSS, not inline styles.
        'table',
        'thead',
        'tbody',
        'tfoot',
        'tr',
        'th',
        'td',
        'caption',
        'colgroup',
        'col',
    ],
    allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
        // `colwidth` is how TipTap persists column sizes; keeping it means a resized
        // table survives a save/load round-trip.
        th: ['colspan', 'rowspan', 'scope', 'colwidth'],
        td: ['colspan', 'rowspan', 'colwidth'],
        col: ['span', 'width'],
        colgroup: ['span'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
    allowProtocolRelative: false,
    parseStyleAttributes: false,
    enforceHtmlBoundary: true,
}

export function sanitizeHtmlContent(html: string): string {
    if (typeof html !== 'string' || html.trim() === '') {
        return ''
    }

    try {
        return sanitizeHtml(html, SANITIZE_OPTIONS)
    } catch {
        return ''
    }
}
