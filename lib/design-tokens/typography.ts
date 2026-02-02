/**
 * Design Token: Typography
 * Extracted from mumnhun-design mockup repository
 * 
 * Font: Poppins (Google Fonts)
 * Weights: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
 */

export const typography = {
    // ═══════════════════════════════════════════════════════
    // FONT FAMILIES
    // ═══════════════════════════════════════════════════════
    fontFamily: {
        primary: "'Poppins', sans-serif",
        sans: "'Poppins', system-ui, -apple-system, sans-serif",
    },

    // ═══════════════════════════════════════════════════════
    // FONT SIZES (Mobile → Desktop)
    // ═══════════════════════════════════════════════════════
    fontSize: {
        // Headings with responsive sizing
        hero: {
            mobile: '2.25rem',   // text-4xl (36px)
            tablet: '3.75rem',   // text-6xl (60px)  
            desktop: '4.5rem',   // text-7xl (72px)
        },
        h1: {
            mobile: '2.25rem',   // text-4xl (36px)
            tablet: '3rem',      // text-5xl (48px)
            desktop: '3.75rem',  // text-6xl (60px)
        },
        h2: {
            mobile: '1.875rem',  // text-3xl (30px)
            tablet: '2.25rem',   // text-4xl (36px)
            desktop: '3rem',     // text-5xl (48px)
        },
        h3: {
            mobile: '1.5rem',    // text-2xl (24px)
            tablet: '1.875rem',  // text-3xl (30px)
            desktop: '1.875rem', // text-3xl (30px)
        },
        h4: {
            mobile: '1.25rem',   // text-xl (20px)
            desktop: '1.25rem',
        },
        body: {
            DEFAULT: '1rem',       // text-base (16px)
            large: '1.125rem',     // text-lg (18px)
            xl: '1.25rem',         // text-xl (20px)
        },
        small: {
            DEFAULT: '0.875rem',   // text-sm (14px)
            xs: '0.75rem',         // text-xs (12px)
        },
    },

    // ═══════════════════════════════════════════════════════
    // FONT WEIGHTS
    // ═══════════════════════════════════════════════════════
    fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },

    // ═══════════════════════════════════════════════════════
    // LINE HEIGHTS
    // ═══════════════════════════════════════════════════════
    lineHeight: {
        none: 1,
        tight: 1.1,       // Hero headings
        snug: 1.25,       // Subheadings
        normal: 1.5,      // Body text
        relaxed: 1.625,   // Paragraphs with more breathing room
        loose: 2,         // Spacious text
    },

    // ═══════════════════════════════════════════════════════
    // LETTER SPACING
    // ═══════════════════════════════════════════════════════
    letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',   // tracking-tight (headings)
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',     // tracking-widest (uppercase labels)
    },

    // ═══════════════════════════════════════════════════════
    // TEXT STYLES (Composition)
    // ═══════════════════════════════════════════════════════
    textStyles: {
        // Hero section
        heroHeading: {
            fontSize: 'text-4xl md:text-6xl xl:text-7xl',
            fontWeight: 'font-bold',
            lineHeight: 'leading-[1.1]',
            letterSpacing: 'tracking-tight',
            color: 'text-secondary',
        },
        heroSubheading: {
            fontSize: 'text-lg md:text-xl',
            fontWeight: 'font-light',
            lineHeight: 'leading-relaxed',
            color: 'text-secondary/70',
        },

        // Section headings
        sectionHeading: {
            fontSize: 'text-3xl md:text-5xl',
            fontWeight: 'font-bold',
            letterSpacing: 'tracking-tight',
            color: 'text-secondary',
        },
        sectionSubheading: {
            fontSize: 'text-lg',
            fontWeight: 'font-normal',
            color: 'text-secondary/60',
        },

        // Component headings
        cardTitle: {
            fontSize: 'text-xl',
            fontWeight: 'font-bold',
            color: 'text-secondary',
        },
        cardDescription: {
            fontSize: 'text-sm',
            fontWeight: 'font-normal',
            lineHeight: 'leading-relaxed',
            color: 'text-secondary/70',
        },

        // Pricing
        priceDisplay: {
            fontSize: 'text-4xl lg:text-5xl',
            fontWeight: 'font-bold',
            letterSpacing: 'tracking-tight',
        },
        durationLabel: {
            fontSize: 'text-sm',
            fontWeight: 'font-bold',
            letterSpacing: 'tracking-widest',
            textTransform: 'uppercase',
            color: 'text-gray-500',
        },

        // Buttons
        buttonText: {
            fontSize: 'text-sm',
            fontWeight: 'font-semibold',
        },
        buttonTextLarge: {
            fontSize: 'text-base',
            fontWeight: 'font-semibold',
        },

        // Labels & Tags
        badge: {
            fontSize: 'text-xs',
            fontWeight: 'font-semibold',
            letterSpacing: 'tracking-wide',
        },
        tag: {
            fontSize: 'text-sm',
            fontWeight: 'font-medium',
        },

        // Testimonials
        testimonialQuote: {
            fontSize: 'text-xl md:text-3xl',
            fontWeight: 'font-medium',
            lineHeight: 'leading-relaxed',
            letterSpacing: 'tracking-tight',
        },
        testimonialName: {
            fontSize: 'text-xl',
            fontWeight: 'font-bold',
        },
        testimonialRole: {
            fontSize: 'text-sm',
            fontWeight: 'font-medium',
            letterSpacing: 'tracking-wider',
            textTransform: 'uppercase',
            color: 'text-secondary/50',
        },

        // FAQ
        faqQuestion: {
            fontSize: 'text-base',
            fontWeight: 'font-semibold',
        },
        faqAnswer: {
            fontSize: 'text-base',
            fontWeight: 'font-normal',
            lineHeight: 'leading-relaxed',
            color: 'text-gray-600',
        },
    },
} as const;

// ═══════════════════════════════════════════════════════
// GOOGLE FONTS IMPORT URL
// ═══════════════════════════════════════════════════════
export const googleFontsUrl =
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';

export type TypographyToken = typeof typography;
