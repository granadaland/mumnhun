import Link from "next/link"
import { Container } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Home, Search } from "lucide-react"

export default function NotFound() {
    return (
        <div className="pt-40 pb-16 md:pt-48 md:pb-24">
            <Container className="text-center">
                <div className="text-8xl font-bold text-mumnhun-200 mb-4">404</div>
                <h1 className="text-3xl font-bold mb-4">
                    Halaman Tidak Ditemukan
                </h1>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Maaf, halaman yang Anda cari tidak ditemukan.
                    Mungkin sudah dihapus atau alamatnya salah.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                    <Button asChild>
                        <Link href="/">
                            <Home className="h-4 w-4 mr-2" />
                            Ke Beranda
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/blog">
                            <Search className="h-4 w-4 mr-2" />
                            Cari Artikel
                        </Link>
                    </Button>
                </div>
            </Container>
        </div>
    )
}
