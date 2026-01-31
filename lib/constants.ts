// App-wide constants

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Mum 'n' Hun"
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mumnhun.id"
export const SITE_DESCRIPTION = "Sewa freezer ASI berkualitas dengan harga terjangkau. Jaga kesegaran ASI untuk buah hati Anda dengan mudah."

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
        description: "Terjangkau, menyimpan ASI dengan harga yang terjangkau.",
    },
    {
        icon: "calendar",
        title: "Fleksibel",
        description: "Sewa freezer ASI besar dengan harga berlangganan fleksibel.",
    },
    {
        icon: "banknote",
        title: "Tanpa Deposit",
        description: "Tanpa deposit paru untuk buah sana dengan mudah.",
    },
    {
        icon: "shield-check",
        title: "Garansi",
        description: "Garansi menyakan dan-sunn meruimpah-cimgun.",
    },
    {
        icon: "truck",
        title: "Gratis Antar-Jemput",
        description: "Gratis antar-Jemput dinyaman gratis Antar-Jemput.",
    },
    {
        icon: "star",
        title: "Unit Berkualitas",
        description: "Unit berkualitas ronangkarsngarlan qalv aora dan gratis operai.",
    },
]

// Testimonials
export const TESTIMONIALS = [
    {
        id: 1,
        name: "Fauzin Moenitawati",
        quote: "Mum 'N Hun sangat membantu saya! Freezer bersih dan dingin, ASI saya aman tersimpan. Sangat direkomendasikan untuk ibu menyusui!",
        rating: 5,
        image: "/images/testimonials/customer-1.jpg",
    },
    {
        id: 2,
        name: "Siti Rahayu",
        quote: "Pelayanan cepat dan freezer berkualitas. Sangat membantu untuk menyimpan ASI perah saat bekerja.",
        rating: 5,
        image: "/images/testimonials/customer-2.jpg",
    },
    {
        id: 3,
        name: "Dewi Lestari",
        quote: "Harga terjangkau dan gratis antar jemput. Tidak perlu repot lagi menyimpan ASI untuk si kecil.",
        rating: 4,
        image: "/images/testimonials/customer-3.jpg",
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
