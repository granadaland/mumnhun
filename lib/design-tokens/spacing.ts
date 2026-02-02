/**
 * Design Token: Spacing
 * Extracted from mumnhun-design mockup repository
 * 
 * Spacing system based on Tailwind defaults with design-specific values
 */

export const spacing = {
    // ═══════════════════════════════════════════════════════
    // CONTAINER MAX WIDTHS
    // ═══════════════════════════════════════════════════════
    container: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
        // Design-specific containers
        content: '768px',        // Blog content max-width
        narrow: '640px',         // Narrow sections
        default: '1280px',       // max-w-6xl - Most sections
        wide: '1400px',          // max-w-7xl - Full-width sections
    },

    // ═══════════════════════════════════════════════════════
    // SECTION PADDING (Vertical)
    // ═══════════════════════════════════════════════════════
    sectionPadding: {
        // Default section spacing
        y: {
            mobile: '4rem',        // py-16 (64px)
            desktop: '6rem',       // py-24 (96px)
        },
        // Hero section (larger spacing)
        hero: {
            mobile: '9rem',        // pt-36 (144px) - accounts for navbar
            desktop: '12rem',      // pt-48 (192px)
        },
        heroBottom: {
            mobile: '5rem',        // pb-20 (80px)
            desktop: '8rem',       // pb-32 (128px)
        },
        // Compact section
        compact: {
            mobile: '3rem',        // py-12
            desktop: '5rem',       // py-20
        },
    },

    // ═══════════════════════════════════════════════════════
    // COMPONENT SPACING
    // ═══════════════════════════════════════════════════════
    component: {
        // Gap between elements
        gap: {
            xs: '0.5rem',          // gap-2
            sm: '1rem',            // gap-4
            md: '1.5rem',          // gap-6
            lg: '2rem',            // gap-8
            xl: '3rem',            // gap-12
            '2xl': '4rem',         // gap-16
            '3xl': '5rem',         // gap-20
            section: '6rem',       // gap-24
        },
        // Margin bottom for headings
        headingMargin: {
            section: '5rem',       // mb-20 (section title to content)
            subsection: '2rem',    // mb-8 (subsection titles)
            component: '1.5rem',   // mb-6 (component titles)
            text: '1rem',          // mb-4 (heading to paragraph)
        },
    },

    // ═══════════════════════════════════════════════════════
    // CARD & COMPONENT PADDING
    // ═══════════════════════════════════════════════════════
    padding: {
        // Card padding
        card: {
            sm: '1rem',            // p-4
            md: '1.5rem',          // p-6
            lg: '2rem',            // p-8
            xl: '2.5rem',          // p-10
        },
        // Testimonial card (large)
        testimonial: {
            mobile: '2rem',        // p-8
            desktop: '4rem',       // p-16
        },
        // Button padding
        button: {
            sm: '0.625rem 1.25rem', // px-5 py-2.5
            md: '1rem 2rem',        // px-8 py-4
            lg: '1.25rem 2.5rem',   // larger CTA
        },
        // FAQ items
        faq: '1.25rem',          // p-5
    },

    // ═══════════════════════════════════════════════════════
    // BORDER RADIUS
    // ═══════════════════════════════════════════════════════
    borderRadius: {
        none: '0',
        sm: '0.375rem',          // rounded-md
        DEFAULT: '0.5rem',       // rounded-lg
        md: '0.75rem',           // rounded-xl
        lg: '1rem',              // rounded-2xl
        xl: '1.5rem',            // rounded-3xl
        '2xl': '2rem',           // rounded-[2rem]
        '3xl': '2.5rem',         // rounded-[2.5rem]
        '4xl': '3rem',           // rounded-[3rem]
        full: '9999px',          // rounded-full
    },

    // ═══════════════════════════════════════════════════════
    // ICON SIZES
    // ═══════════════════════════════════════════════════════
    iconSize: {
        xs: '0.75rem',           // 12px
        sm: '0.875rem',          // 14px
        md: '1rem',              // 16px
        lg: '1.125rem',          // 18px
        xl: '1.25rem',           // 20px
        '2xl': '1.5rem',         // 24px
        '3xl': '1.75rem',        // 28px
        heroIcon: '4rem',        // 64px - Feature icon boxes
    },

    // ═══════════════════════════════════════════════════════
    // AVATAR & IMAGE SIZES
    // ═══════════════════════════════════════════════════════
    avatar: {
        xs: '2rem',              // w-8 h-8
        sm: '2.5rem',            // w-10 h-10
        md: '3rem',              // w-12 h-12
        lg: '4rem',              // w-16 h-16
        xl: '10rem',             // w-40 h-40 - Testimonial mobile
        '2xl': '14rem',          // w-56 h-56 - Testimonial desktop
    },

    // ═══════════════════════════════════════════════════════
    // GRID SPECIFICATIONS
    // ═══════════════════════════════════════════════════════
    grid: {
        // Feature/Benefit cards
        features: {
            columns: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
            gap: 'gap-8',
        },
        // Pricing cards
        pricing: {
            columns: 'flex flex-col md:flex-row',
            gap: 'gap-8 lg:gap-12',
            itemWidth: 'w-full md:w-1/3 max-w-sm',
        },
        // FAQ + Articles side-by-side
        faqArticles: {
            columns: 'grid-cols-1 lg:grid-cols-2',
            gap: 'gap-16 lg:gap-24',
        },
        // Footer
        footer: {
            columns: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-12',
            gap: 'gap-12 lg:gap-8',
        },
    },
} as const;

// ═══════════════════════════════════════════════════════
// TAILWIND CLASS COMPOSITIONS
// ═══════════════════════════════════════════════════════
export const spacingClasses = {
    section: 'py-20 md:py-24 px-6',
    sectionCompact: 'py-16 px-6',
    container: 'container mx-auto max-w-6xl',
    containerWide: 'container mx-auto max-w-7xl',
    cardPadding: 'p-8 lg:p-10',
} as const;

export type SpacingToken = typeof spacing;
