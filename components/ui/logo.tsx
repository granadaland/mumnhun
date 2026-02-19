import React from "react"
import { cn } from "@/lib/utils"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
    variant?: "default" | "light" | "dark"
    className?: string
}

export function Logo({ variant = "default", className, ...props }: LogoProps) {
    // Color configuration - Harmonized with site palette
    const colors = {
        default: {
            text: "#382821",    // Coffee - Strong, readable
            accent: "#C48B77",  // Terracotta - Warmth
            bottle: "#466A68",  // Teal - Freshness/Health
            milk: "#FFFBF7"     // Cream - Milk color (used for fill/accents)
        },
        light: {
            text: "#FFFFFF",
            accent: "#F0E5D8",
            bottle: "#F0E5D8",
            milk: "#FFFFFF"
        },
        dark: {
            text: "#382821",
            accent: "#A67766",
            bottle: "#2F4A48",
            milk: "#F3E7DB"
        },
    }

    const currentColors = colors[variant]

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 310 70"
            className={cn("w-full h-auto", className)}
            aria-label="Mum 'N Hun Logo"
            {...props}
        >
            <defs>
                {/* Simple drop shadow for the "lively" feel */}
                <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
                    <feOffset in="blur" dx="1" dy="1" result="offsetBlur" />
                    <feFlood floodColor={currentColors.text} floodOpacity="0.1" result="offsetColor" />
                    <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur" />
                    <feMerge>
                        <feMergeNode in="offsetBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* 
        ICON GROUP: Milk Bottle
        Rotated slightly (-10deg) for a "lively," playful feel.
        Positioned on the left.
      */}
            <g transform="translate(35, 38) rotate(-10)">
                {/* Bottle Body Outline */}
                <rect
                    x="-14"
                    y="-18"
                    width="28"
                    height="40"
                    rx="6"
                    fill="none"
                    stroke={currentColors.bottle}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />

                {/* Bottle Neck/Teat */}
                <path
                    d="M-8 -18 L-8 -22 L-5 -25 L5 -25 L8 -22 L8 -18"
                    fill="none"
                    stroke={currentColors.bottle}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Liquid Level (Wavy) - Suggesting milk inside */}
                <path
                    d="M-12 5 Q 0 0, 12 5 L 12 16 Q 0 20, -12 16 Z"
                    fill={currentColors.accent}
                    opacity="0.2"
                />

                {/* Small Heart on the bottle */}
                <path
                    d="M-4 2 C-4 0, -6 -1, -8 1 C-10 -1, -12 0, -12 2 C-12 6, -8 9, 0 14 C 8 9, 12 6, 12 2 C 12 0, 10 -1, 8 1 C 6 -1, 4 0, 4 2"
                    transform="scale(0.4) translate(0, -10)"
                    fill={currentColors.accent}
                />

                {/* Measurement Lines */}
                <line x1="6" y1="-8" x2="10" y2="-8" stroke={currentColors.bottle} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <line x1="6" y1="-2" x2="10" y2="-2" stroke={currentColors.bottle} strokeWidth="2" strokeLinecap="round" opacity="0.6" />

            </g>

            {/* 
        TYPOGRAPHY GROUP
        Aligned to the right of the icon.
      */}
            <g transform="translate(75, 50)" filter="url(#soft-shadow)">
                {/* "Mum" */}
                <text
                    x="0"
                    y="0"
                    style={{ fontFamily: 'var(--font-serif), serif' }}
                    fontSize="42"
                    fontWeight="700"
                    fill={currentColors.text}
                    letterSpacing="-0.5"
                >
                    Mum
                </text>

                {/* "'N" - Smaller, italic, lighter color */}
                <text
                    x="105"
                    y="0"
                    style={{ fontFamily: 'var(--font-serif), serif' }}
                    fontSize="32"
                    fontStyle="italic"
                    fontWeight="400"
                    fill={currentColors.accent}
                >
                    &#39;N
                </text>

                {/* "Hun" */}
                <text
                    x="145"
                    y="0"
                    style={{ fontFamily: 'var(--font-serif), serif' }}
                    fontSize="42"
                    fontWeight="700"
                    fill={currentColors.text}
                    letterSpacing="-0.5"
                >
                    Hun
                </text>
            </g>
        </svg>
    )
}
