import { Metadata } from "next"
import { Mail, MapPin, Clock, MessageCircle, ArrowRight, Instagram, Facebook, Youtube } from "lucide-react"
import { Container } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SITE_NAME, SITE_URL, CONTACT_INFO, SOCIAL_URLS } from "@/lib/constants"
import Link from "next/link"

export const metadata: Metadata = {
    title: "Kontak",
    description: `Hubungi tim ${SITE_NAME}. Kami siap membantu Anda.`,
    alternates: {
        canonical: `${SITE_URL}/kontak`,
    },
    openGraph: {
        title: "Kontak",
        description: `Hubungi tim ${SITE_NAME}. Kami siap membantu Anda.`,
        url: `${SITE_URL}/kontak`,
        type: "website",
        siteName: SITE_NAME,
    },
    twitter: {
        card: "summary_large_image",
        title: "Kontak",
        description: `Hubungi tim ${SITE_NAME}. Kami siap membantu Anda.`,
    },
}

export default function KontakPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#FFFBF7] to-white">
            {/* Hero Section */}
            <section className="pt-32 pb-12 px-6">
                <Container>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-[#E8D5C4]/30 text-[#7A6854] text-sm font-semibold mb-6">
                            Hubungi Kami
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold text-[#382821] mb-6 leading-tight">
                            Kami Siap Membantu Moms!
                        </h1>
                        <p className="text-lg text-[#382821]/70 leading-relaxed">
                            Punya pertanyaan seputar layanan kami atau ingin berkolaborasi?
                            Jangan ragu untuk menghubungi tim Mum&apos;n&apos;Hun.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
                        {/* Contact Info Side (Left) */}
                        <div className="lg:col-span-5 space-y-8">
                            {/* Info Cards */}
                            <div className="grid gap-6">
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E8D5C4]/30 flex items-start gap-4 transition-all hover:shadow-md">
                                    <div className="w-12 h-12 rounded-2xl bg-[#FFF5F0] flex items-center justify-center flex-shrink-0 text-[#FF7744]">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#382821] text-lg mb-1">Email</h3>
                                        <p className="text-[#382821]/60 text-sm mb-2">Kirim pertanyaan kapan saja</p>
                                        <a href="mailto:hello@mumnhun.id" className="text-[#466A68] font-semibold hover:underline">
                                            hello@mumnhun.id
                                        </a>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E8D5C4]/30 flex items-start gap-4 transition-all hover:shadow-md">
                                    <div className="w-12 h-12 rounded-2xl bg-[#F0F7F6] flex items-center justify-center flex-shrink-0 text-[#466A68]">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#382821] text-lg mb-1">Lokasi Studio</h3>
                                        <p className="text-[#382821]/60 text-sm mb-2">Datang berkunjung ke kantor kami</p>
                                        <p className="text-[#382821] font-medium">Jakarta Selatan, Indonesia</p>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E8D5C4]/30 flex items-start gap-4 transition-all hover:shadow-md">
                                    <div className="w-12 h-12 rounded-2xl bg-[#FFF8F0] flex items-center justify-center flex-shrink-0 text-[#E65522]">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#382821] text-lg mb-1">Jam Operasional</h3>
                                        <p className="text-[#382821]/60 text-sm mb-2">Layanan Customer Service</p>
                                        <p className="text-[#382821] font-medium">{CONTACT_INFO.workHours}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Social Media */}
                            <div className="bg-[#466A68] p-8 rounded-3xl text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                                <h3 className="text-xl font-bold mb-4 relative z-10">Sosial Media</h3>
                                <p className="text-white/80 mb-6 relative z-10">
                                    Ikuti kami untuk tips harian seputar parenting dan ASI.
                                </p>
                                <div className="flex gap-4 relative z-10">
                                    <a href={SOCIAL_URLS.instagram || "#"} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white hover:text-[#466A68] transition-all">
                                        <Instagram className="w-5 h-5" />
                                    </a>
                                    <a href={SOCIAL_URLS.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white hover:text-[#466A68] transition-all">
                                        <Facebook className="w-5 h-5" />
                                    </a>
                                    <a href={SOCIAL_URLS.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white hover:text-[#466A68] transition-all">
                                        <Youtube className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form Side (Right) */}
                        <div className="lg:col-span-7">
                            <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-lg border border-[#E8D5C4]/20 h-full">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-[#382821] mb-2">Kirim Pesan</h2>
                                    <p className="text-[#382821]/60">
                                        Silakan isi formulir di bawah ini, tim kami akan membalas secepatnya.
                                    </p>
                                </div>

                                <form className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-[#382821]">Nama Lengkap</label>
                                            <Input
                                                placeholder="Nama Moms"
                                                className="h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-[#382821]">Email</label>
                                            <Input
                                                type="email"
                                                placeholder="email@contoh.com"
                                                className="h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#382821]">Subjek</label>
                                        <Input
                                            placeholder="Perihal pesan..."
                                            className="h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white transition-colors"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#382821]">Pesan</label>
                                        <textarea
                                            placeholder="Tulis pesan Moms di sini..."
                                            rows={6}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#466A68]/20 transition-all resize-none"
                                        />
                                    </div>

                                    <Button className="w-full h-12 rounded-xl bg-[#466A68] hover:bg-[#3D5C5A] text-white font-semibold text-lg hover:shadow-lg hover:-translate-y-0.5 transition-all">
                                        Kirim Pesan Sekarang
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* FAQ Teaser */}
                    <div className="mt-20 text-center bg-[#FFF8F0] rounded-[2rem] p-8 md:p-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                            <MessageCircle className="w-64 h-64 text-[#FF7744]" />
                        </div>

                        <div className="relative z-10 max-w-2xl mx-auto">
                            <h2 className="text-2xl md:text-3xl font-bold text-[#382821] mb-4">
                                Punya Pertanyaan Lain?
                            </h2>
                            <p className="text-[#382821]/70 mb-8 text-lg">
                                Cek halaman Petunjuk kami untuk melihat jawaban dari pertanyaan yang sering diajukan oleh para Moms.
                            </p>
                            <Link href="/petunjuk">
                                <Button variant="outline" className="h-12 px-8 rounded-full border-2 border-[#466A68] text-[#466A68] hover:bg-[#466A68] hover:text-white font-bold transition-all">
                                    Lihat Petunjuk & FAQ
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Container>
            </section>
        </div>
    )
}
