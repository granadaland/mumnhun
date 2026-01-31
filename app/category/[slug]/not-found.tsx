import Link from "next/link"
import { Container } from "@/components/layout"
import { Button } from "@/components/ui/button"

export default function CategoryNotFound() {
    return (
        <div className="py-16 md:py-24">
            <Container className="text-center">
                <div className="text-6xl mb-6">📁</div>
                <h1 className="text-3xl font-bold mb-4">
                    Kategori Tidak Ditemukan
                </h1>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Maaf, kategori yang Anda cari tidak ditemukan.
                </p>
                <div className="flex gap-4 justify-center">
                    <Button asChild>
                        <Link href="/blog">Lihat Semua Artikel</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/">Ke Beranda</Link>
                    </Button>
                </div>
            </Container>
        </div>
    )
}
