import { ZodError } from "zod"
import { NextResponse } from "next/server"

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
    if (error instanceof Error) return error.message
    if (typeof error === "string") return error
    return "Unknown error"
}

export function getPrismaErrorCode(error: unknown): string | null {
    if (error && typeof error === "object" && "code" in error) {
        const code = (error as { code?: unknown }).code
        if (typeof code === "string") return code
    }
    return null
}

