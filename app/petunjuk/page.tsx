import { Metadata } from "next"
import { Container } from "@/components/layout"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, FileText, MessageSquare, Search } from "lucide-react"

export const metadata: Metadata = {
    title: "Petunjuk",
    description: "Petunjuk penggunaan dan panduan navigasi situs Mum 'n' Hun.",
}

const guides = [
    {
        icon: BookOpen,
        title: "Membaca Artikel",
        description: "Temukan artikel parenting berkualitas di halaman Blog. Gunakan kategori atau tag untuk menemukan topik spesifik.",
    },
    {
        icon: Search,
        title: "Mencari Artikel",
        description: "Gunakan fitur pencarian di bagian atas halaman untuk menemukan artikel berdasarkan kata kunci.",
    },
    {
        icon: FileText,
        title: "Kategori Artikel",
        description: "Artikel dikelompokkan berdasarkan kategori seperti Kehamilan, Bayi, Balita, dan lainnya untuk memudahkan navigasi.",
    },
    {
        icon: MessageSquare,
        title: "Hubungi Kami",
        description: "Ada pertanyaan atau saran? Kunjungi halaman Kontak untuk menghubungi tim kami.",
    },
]

export default function PetunjukPage() {
    return (
        <div className="py-12 md:py-16">
            <Container size="narrow">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                        Petunjuk Penggunaan
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Panduan lengkap untuk menavigasi dan menggunakan situs Mum &apos;n&apos; Hun.
                    </p>
                </div>

                {/* Guide Cards */}
                <div className="grid gap-6">
                    {guides.map((guide, index) => {
                        const Icon = guide.icon
                        return (
                            <Card key={index}>
                                <CardContent className="flex gap-4 p-6">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 rounded-lg bg-mumnhun-100 flex items-center justify-center">
                                            <Icon className="h-6 w-6 text-mumnhun-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-lg mb-2">{guide.title}</h2>
                                        <p className="text-muted-foreground">{guide.description}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* Additional Info */}
                <div className="mt-12 p-6 bg-mumnhun-50 rounded-lg">
                    <h2 className="font-semibold text-lg mb-4">Tentang Mum &apos;n&apos; Hun</h2>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                        <p>
                            Mum &apos;n&apos; Hun adalah blog parenting Indonesia yang menyediakan
                            informasi dan tips seputar kehamilan, perawatan bayi, dan tumbuh
                            kembang anak. Konten kami ditulis dengan penuh kasih sayang untuk
                            membantu para orang tua Indonesia dalam perjalanan parenting mereka.
                        </p>
                        <p className="mt-4">
                            Semua artikel kami ditulis berdasarkan riset dan pengalaman nyata,
                            dengan tujuan memberikan panduan praktis yang dapat langsung
                            diterapkan dalam kehidupan sehari-hari.
                        </p>
                    </div>
                </div>
            </Container>
        </div>
    )
}
