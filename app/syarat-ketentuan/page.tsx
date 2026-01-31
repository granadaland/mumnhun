import { Metadata } from "next"
import { Container } from "@/components/layout"
import { SITE_NAME } from "@/lib/constants"

export const metadata: Metadata = {
    title: "Syarat & Ketentuan",
    description: `Syarat dan ketentuan penggunaan situs ${SITE_NAME}.`,
}

export default function SyaratKetentuanPage() {
    return (
        <div className="py-12 md:py-16">
            <Container size="narrow">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                        Syarat & Ketentuan
                    </h1>
                    <p className="text-muted-foreground">
                        Terakhir diperbarui: Januari 2026
                    </p>
                </div>

                {/* Content */}
                <div className="prose prose-lg max-w-none prose-headings:font-bold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4">
                    <h2>1. Penerimaan Ketentuan</h2>
                    <p>
                        Dengan mengakses dan menggunakan situs Mum &apos;n&apos; Hun, Anda
                        menyetujui untuk terikat dengan syarat dan ketentuan ini. Jika Anda
                        tidak menyetujui salah satu dari ketentuan ini, mohon untuk tidak
                        menggunakan situs kami.
                    </p>

                    <h2>2. Penggunaan Konten</h2>
                    <p>
                        Seluruh konten di situs ini, termasuk artikel, gambar, dan materi
                        lainnya, dilindungi oleh hak cipta. Anda diperbolehkan untuk:
                    </p>
                    <ul>
                        <li>Membaca dan mengakses konten untuk penggunaan pribadi</li>
                        <li>Membagikan tautan artikel ke media sosial</li>
                        <li>Mengutip sebagian kecil konten dengan menyertakan kredit dan tautan balik</li>
                    </ul>
                    <p>Anda tidak diperbolehkan untuk:</p>
                    <ul>
                        <li>Menyalin, mereproduksi, atau mendistribusikan konten tanpa izin</li>
                        <li>Menggunakan konten untuk tujuan komersial tanpa persetujuan tertulis</li>
                        <li>Memodifikasi atau mengubah konten dalam bentuk apapun</li>
                    </ul>

                    <h2>3. Disclaimer Kesehatan</h2>
                    <p>
                        Informasi yang disediakan di situs ini hanya untuk tujuan edukasi
                        dan informasi umum. Konten kami <strong>bukan pengganti nasihat
                            medis profesional</strong>. Selalu konsultasikan dengan dokter atau
                        tenaga kesehatan profesional untuk masalah kesehatan Anda dan anak Anda.
                    </p>

                    <h2>4. Tautan Eksternal</h2>
                    <p>
                        Situs kami mungkin berisi tautan ke situs web pihak ketiga. Kami
                        tidak bertanggung jawab atas konten atau praktik privasi situs
                        tersebut. Penggunaan tautan eksternal sepenuhnya menjadi risiko Anda.
                    </p>

                    <h2>5. Komentar dan Interaksi</h2>
                    <p>
                        Jika fitur komentar tersedia, Anda bertanggung jawab atas komentar
                        yang Anda posting. Kami berhak menghapus komentar yang dianggap
                        tidak pantas, menyinggung, atau melanggar ketentuan.
                    </p>

                    <h2>6. Perubahan Ketentuan</h2>
                    <p>
                        Kami berhak mengubah syarat dan ketentuan ini kapan saja. Perubahan
                        akan berlaku segera setelah dipublikasikan di halaman ini. Kami
                        menyarankan Anda untuk memeriksa halaman ini secara berkala.
                    </p>

                    <h2>7. Hubungi Kami</h2>
                    <p>
                        Jika Anda memiliki pertanyaan tentang syarat dan ketentuan ini,
                        silakan hubungi kami melalui halaman <a href="/kontak" className="text-mumnhun-600">Kontak</a>.
                    </p>
                </div>
            </Container>
        </div>
    )
}
