"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Container } from "@/components/layout"
import { Button } from "@/components/ui/button"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log error to console in development
        console.error("Global error:", error)
    }, [error])

    return (
        <div className="py-16 md:py-24">
            <Container className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
                    <AlertTriangle className="h-10 w-10 text-red-600" />
                </div>
                <h1 className="text-3xl font-bold mb-4">
                    Terjadi Kesalahan
                </h1>
                <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                    Maaf, terjadi kesalahan saat memuat halaman ini.
                </p>
                {error.digest && (
                    <p className="text-sm text-muted-foreground mb-6">
                        Kode Error: {error.digest}
                    </p>
                )}
                <div className="flex gap-4 justify-center">
                    <Button onClick={reset}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Coba Lagi
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/">
                            <Home className="h-4 w-4 mr-2" />
                            Ke Beranda
                        </Link>
                    </Button>
                </div>
            </Container>
        </div>
    )
}
