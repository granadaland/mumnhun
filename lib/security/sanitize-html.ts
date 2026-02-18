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
    ],
    allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
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
