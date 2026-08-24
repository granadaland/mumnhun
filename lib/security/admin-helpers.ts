import { ZodError } from "zod"
import { NextResponse } from "next/server"
import { sanitizeAiKeyErrorMessage } from "@/lib/security/ai-key-status"

export function adminJsonValidationError(error: unknown) {
    if (error instanceof ZodError) {
        return NextResponse.json(
            {
                error: "Validation failed",
                issues: error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    code: issue.code,
                    message: issue.message,
                })),
            },
            { status: 400 }
        )
    }

    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
}

export function summarizeUnknownError(error: unknown): string {
    const raw =
        error instanceof Error
            ? error.message
            : typeof error === "string"
                ? error
                : "Unknown error"

    // Gateway error bodies can echo credential material (Authorization headers, keys).
    // Masking centrally keeps it out of server logs and persisted task errors.
    return sanitizeAiKeyErrorMessage(raw)
}

export function getPrismaErrorCode(error: unknown): string | null {
    if (error && typeof error === "object" && "code" in error) {
        const code = (error as { code?: unknown }).code
        if (typeof code === "string") return code
    }
    return null
}

