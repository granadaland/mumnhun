import Link from "next/link"
import { Container } from "@/components/layout"
import { Button } from "@/components/ui/button"

export default function LokasiNotFound() {
    return (
        <div className="py-24 md:py-32">
            <Container className="text-center">
                <div className="text-6xl mb-6">📍</div>
                <h1 className="text-3xl font-bold mb-4 text-[#281E19]">
                    Area Layanan Tidak Ditemukan
                </h1>
                <p className="text-[#382821]/70 mb-8 max-w-md mx-auto">
                    Maaf, area yang Anda cari belum tersedia. Lihat daftar area layanan
                    sewa freezer ASI kami atau hubungi kami untuk menanyakan jangkauan.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                    <Button asChild>
                        <Link href="/sewa-freezer-asi">Lihat Semua Area</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/">Ke Beranda</Link>
                    </Button>
                </div>
            </Container>
        </div>
    )
}
