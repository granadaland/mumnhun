/**
 * Editorial policy applied to every AI-generated image.
 *
 * Two concerns live here so they cannot be forgotten at a call site:
 *  1. Output shape — the site only uses landscape 16:9 or 4:3 images.
 *  2. Modesty rules — this is an Indonesian Muslim parenting audience, so any woman in
 *     frame must wear hijab and be fully covered. The rules are written in English because
 *     image models follow English instructions far more reliably, and they are appended to
 *     the prompt rather than trusted to the prompt author.
 */

export const IMAGE_ASPECT_RATIOS = ["16:9", "4:3"] as const
export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number]

export const DEFAULT_IMAGE_ASPECT_RATIO: ImageAspectRatio = "16:9"

export function isImageAspectRatio(value: unknown): value is ImageAspectRatio {
    return typeof value === "string" && (IMAGE_ASPECT_RATIOS as readonly string[]).includes(value)
}

/**
 * Non-negotiable visual constraints appended to every image prompt.
 *
 * Phrased as hard requirements plus explicit negatives, because image models weight
 * positive descriptions more heavily than bare prohibitions.
 */
export const IMAGE_MODESTY_RULES = [
    "MANDATORY DRESS CODE, must not be violated:",
    "- Every woman and girl in the image MUST wear a hijab that fully covers her hair, ears, and neck. No hair strands visible.",
    "- Clothing must be loose, opaque, and modest: long sleeves down to the wrists, long skirt or trousers covering the ankles, high neckline, nothing tight, nothing sheer, no body contours emphasised.",
    "- Absolutely no exposed skin beyond face and hands. No sleeveless tops, no shorts, no short skirts, no cleavage, no bare shoulders, arms, midriff, legs, or feet.",
    "- Men must also be modestly dressed: sleeved shirt and long trousers.",
    "- Nothing sensual, flirtatious, or intimate. Respectful family-friendly composition only.",
    "- For breastfeeding or pumping context: depict it modestly using a nursing cover, apron, or an angle that shows only the mother's face and the baby. Never show the chest or any part of the breast.",
    "- No text, no lettering, no watermark, no logo, no signature.",
].join("\n")

export type ImagePolicyInput = {
    prompt: string
    aspectRatio?: ImageAspectRatio
}

/**
 * Composes the final prompt sent to the image model: the caller's creative prompt, the
 * modesty rules, and an aspect-ratio hint (belt and braces — the API parameter is set too,
 * but stating it in the prompt improves framing on gateways that ignore the parameter).
 */
export function applyImagePolicy(input: ImagePolicyInput): string {
    const aspectRatio = input.aspectRatio ?? DEFAULT_IMAGE_ASPECT_RATIO

    return [
        input.prompt.trim(),
        "",
        IMAGE_MODESTY_RULES,
        "",
        `Framing: landscape orientation, ${aspectRatio} aspect ratio, subject comfortably inside the frame.`,
    ].join("\n")
}

/**
 * Maps an aspect ratio onto an OpenAI-style `size` string.
 *
 * The OpenAI images API takes pixel dimensions rather than a ratio. Gateways that reject
 * these values are handled by the caller's retry-without-size path.
 */
export function openAiSizeForAspectRatio(aspectRatio: ImageAspectRatio): string {
    return aspectRatio === "4:3" ? "1408x1056" : "1792x1024"
}
