import { Metadata } from "next"
import { Mail, MapPin, Clock } from "lucide-react"
import { Container } from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SITE_NAME } from "@/lib/constants"

export const metadata: Metadata = {
    title: "Kontak",
    description: `Hubungi tim ${SITE_NAME}. Kami siap membantu Anda.`,
}

const contactInfo = [
    {
        icon: Mail,
        title: "Email",
        value: "hello@mumnhun.id",
        description: "Kirim email kapan saja",
    },
    {
        icon: MapPin,
        title: "Lokasi",
        value: "Jakarta, Indonesia",
        description: "Zona waktu WIB",
    },
    {
        icon: Clock,
        title: "Jam Kerja",
        value: "Senin - Jumat",
        description: "09:00 - 17:00 WIB",
    },
]

export default function KontakPage() {
    return (
        <div className="py-12 md:py-16">
            <Container>
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                        Hubungi Kami
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Ada pertanyaan, saran, atau ingin berkolaborasi?
                        Kami senang mendengar dari Anda!
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    {/* Contact Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Kirim Pesan</CardTitle>
                            <CardDescription>
                                Isi formulir di bawah dan kami akan merespons sesegera mungkin.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-medium">
                                            Nama
                                        </label>
                                        <Input id="name" placeholder="Nama Anda" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-sm font-medium">
                                            Email
                                        </label>
                                        <Input id="email" type="email" placeholder="email@contoh.com" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="subject" className="text-sm font-medium">
                                        Subjek
                                    </label>
                                    <Input id="subject" placeholder="Subjek pesan" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="message" className="text-sm font-medium">
                                        Pesan
                                    </label>
                                    <textarea
                                        id="message"
                                        rows={5}
                                        placeholder="Tulis pesan Anda di sini..."
                                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                                <Button type="submit" className="w-full bg-mumnhun-600 hover:bg-mumnhun-700">
                                    Kirim Pesan
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Informasi Kontak</h2>
                            <p className="text-muted-foreground mb-6">
                                Anda juga dapat menghubungi kami melalui informasi di bawah ini.
                            </p>
                        </div>

                        {contactInfo.map((info, index) => {
                            const Icon = info.icon
                            return (
                                <Card key={index}>
                                    <CardContent className="flex items-start gap-4 p-4">
                                        <div className="w-10 h-10 rounded-lg bg-mumnhun-100 flex items-center justify-center flex-shrink-0">
                                            <Icon className="h-5 w-5 text-mumnhun-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">{info.title}</h3>
                                            <p className="text-mumnhun-600">{info.value}</p>
                                            <p className="text-sm text-muted-foreground">{info.description}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}

                        {/* FAQ Link */}
                        <Card className="bg-mumnhun-50 border-mumnhun-100">
                            <CardContent className="p-6">
                                <h3 className="font-semibold mb-2">Pertanyaan Umum?</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Mungkin pertanyaan Anda sudah terjawab di halaman Petunjuk kami.
                                </p>
                                <Button asChild variant="outline" size="sm">
                                    <a href="/petunjuk">Lihat Petunjuk</a>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </Container>
        </div>
    )
}
