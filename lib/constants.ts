// App-wide constants

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Mum 'n' Hun"
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mumnhun.id"
export const SITE_DESCRIPTION = "Sewa Freezer ASI Jakarta Bogor Depok Tangerang Bekasi (JABODETABEK). Harga sewa freezer ASI mulai Rp160rb/bulan. Rental kulkas ASI berkualitas, steril, gratis antar-jemput. Temukan sewa freezer ASI terdekat!"

// SEO defaults
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`

// Pagination
export const POSTS_PER_PAGE = 12

// WhatsApp Contact
export const WHATSAPP_NUMBER = "6281553328867" // Update with real number
export const WHATSAPP_MESSAGE = "Halo, saya tertarik untuk menyewa freezer ASI. Bisa dibantu?"
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

// Contact Information
export const CONTACT_INFO = {
    email: "admin@mumnhun.id",
    phone: "+62 815 5332 8867",
    whatsapp: WHATSAPP_NUMBER,
    address: "Jakarta, Indonesia",
    workHours: "Senin - Jumat: 09:00 - 17:00 WIB",
}

// Navigation Links
export const NAV_LINKS = [
    { href: "/", label: "Beranda" },
    { href: "/petunjuk", label: "Petunjuk" },
    { href: "/syarat-ketentuan", label: "Syarat" },
    { href: "/blog", label: "Blog" },
    { href: "/kontak", label: "Kontak" },
]

// Pricing Packages
export const PRICING_PACKAGES = [
    {
        id: "1-bulan",
        duration: "1 Bulan",
        price: 160000,
        priceDisplay: "Rp160k",
        features: [
            "Tanpa Deposit",
            "Gratis Antar-Jemput",
            "Garansi Unit",
            "Konsultasi Laktasi",
        ],
        popular: false,
    },
    {
        id: "3-bulan",
        duration: "3 Bulan",
        price: 325000,
        priceDisplay: "Rp325k",
        features: [
            "Tanpa Deposit",
            "Gratis Antar-Jemput",
            "Garansi Unit",
            "Lebih Hemat special gift",
        ],
        popular: true,
    },
    {
        id: "6-bulan",
        duration: "6 Bulan",
        price: 550000,
        priceDisplay: "Rp550k",
        features: [
            "Max Savings",
            "Gratis Antar-Jemput",
            "Garansi Unit",
            "Priority on priority special gift",
        ],
        popular: false,
    },
]

// Service Benefits
export const SERVICE_BENEFITS = [
    {
        icon: "piggy-bank",
        title: "Terjangkau",
        description: "Sewa freezer ASI dengan harga yang ramah di kantong, mulai dari Rp160rb/bulan.",
    },
    {
        icon: "calendar",
        title: "Fleksibel",
        description: "Pilih durasi sewa sesuai kebutuhan: 1 bulan, 3 bulan, atau 6 bulan.",
    },
    {
        icon: "banknote",
        title: "Tanpa Deposit",
        description: "Tidak perlu deposit! Cukup bayar biaya sewa tanpa biaya tambahan.",
    },
    {
        icon: "shield-check",
        title: "Garansi",
        description: "Garansi penuh selama masa sewa. Jika ada kerusakan, kami ganti unit baru.",
    },
    {
        icon: "truck",
        title: "Gratis Antar-Jemput",
        description: "Layanan antar-jemput gratis untuk area Jakarta dan sekitarnya (JABODETABEK).",
    },
    {
        icon: "star",
        title: "Unit Berkualitas",
        description: "Freezer berkualitas tinggi, bersih, steril, dan hemat energi untuk menyimpan ASI.",
    },
]

// Testimonials
export const TESTIMONIALS = [
    {
        id: 1,
        name: "Fauzin Moenitawati",
        role: "Ibu Rumah Tangga",
        content: "Mum 'N Hun sangat membantu saya! Freezer bersih dan dingin, ASI saya aman tersimpan. Sangat direkomendasikan untuk ibu menyusui!",
        rating: 5,
        initials: "FM",
    },
    {
        id: 2,
        name: "Siti Rahayu",
        role: "Karyawan Swasta",
        content: "Pelayanan cepat dan freezer berkualitas. Sangat membantu untuk menyimpan ASI perah saat bekerja. Tim supportnya juga sangat responsif!",
        rating: 5,
        initials: "SR",
    },
    {
        id: 3,
        name: "Dewi Lestari",
        role: "Dokter",
        content: "Harga terjangkau dan gratis antar jemput. Tidak perlu repot lagi menyimpan ASI untuk si kecil. Kualitas freezernya juga sangat baik!",
        rating: 5,
        initials: "DL",
    },
]

// FAQ Data
export const FAQ_DATA = [
    {
        question: "Bagaimana cara menyewa?",
        answer: "Hubungi kami via WhatsApp, pilih paket sewa yang sesuai, lakukan pembayaran, dan freezer akan diantar ke rumah Anda.",
    },
    {
        question: "Apakah ada jaminan unit?",
        answer: "Ya, semua unit kami bergaransi. Jika ada kerusakan yang bukan disebabkan oleh kelalaian, kami akan mengganti dengan unit baru.",
    },
    {
        question: "Berapa biaya antar?",
        answer: "Gratis! Kami menyediakan layanan antar-jemput gratis untuk area Jakarta dan sekitarnya.",
    },
    {
        question: "Apakah perlu deposit?",
        answer: "Tidak perlu deposit. Anda hanya membayar biaya sewa bulanan tanpa biaya tambahan.",
    },
    {
        question: "Bagaimana jika ingin perpanjang sewa?",
        answer: "Cukup hubungi kami sebelum masa sewa berakhir. Pembayaran bisa dilakukan via transfer bank.",
    },
]

// Categories (will be fetched from DB, but kept here for reference)
export const MAIN_CATEGORIES = [
    { slug: "kehamilan", name: "Kehamilan" },
    { slug: "bayi", name: "Bayi" },
    { slug: "balita", name: "Balita" },
    { slug: "anak", name: "Anak" },
    { slug: "kesehatan", name: "Kesehatan" },
    { slug: "nutrisi", name: "Nutrisi" },
    { slug: "tips", name: "Tips" },
]

// Indonesian month names for date formatting
export const INDONESIAN_MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

// Reading time estimation (words per minute)
export const WORDS_PER_MINUTE = 200
