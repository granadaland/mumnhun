// App-wide constants

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Mum 'N Hun"
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mumnhun.id"
export const SITE_DESCRIPTION = "Sewa freezer ASI murah untuk wilayah Jakarta Selatan, Depok, Jakarta Timur, Jakarta Utara, Jakarta Pusat, Bogor, Tangerang, Bintaro, Bekasi, BSD"

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
    workHours: "Setiap Hari (kecuali Jumat): 09.00 - 17.00 WIB",
}

export const SOCIAL_URLS = {
    facebook: "https://www.facebook.com/people/Mum-n-Hun/61561111410911/",
    twitter: "https://x.com/mumnhun",
    youtube: "https://www.youtube.com/@Mumnhun",
    instagram: "https://www.instagram.com/sewafreezerasijabodetabek/",
}

// Navigation Links
export const NAV_LINKS = [
    { href: "/", label: "Beranda" },
    { href: "/petunjuk-pemakaian", label: "Petunjuk" },
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
        priceDisplay: "Rp160.000",
        features: [
            "Tanpa Deposit",
            "Layanan Antar-Jemput",
            "Garansi Unit",
            "Konsultasi Laktasi",
        ],
        popular: false,
    },
    {
        id: "3-bulan",
        duration: "3 Bulan",
        price: 325000,
        priceDisplay: "Rp325.000",
        features: [
            "Tanpa Deposit",
            "Layanan Antar-Jemput",
            "Garansi Unit",
            "Lebih hemat",
        ],
        popular: true,
    },
    {
        id: "6-bulan",
        duration: "6 Bulan",
        price: 550000,
        priceDisplay: "Rp550.000",
        features: [
            "Paket paling hemat",
            "Layanan Antar-Jemput",
            "Garansi Unit",
            "Prioritas dukungan",
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
        name: "Zhed K",
        role: "Pelanggan Happy",
        content: "Respon cepat dan baik, 3 bulan pakai freezernya ga ada masalah, dan udah cari2 ini tempat sewa yang murah.. dan pastinya kalo mau sewa lagi udah pasti kesini.",
        rating: 5,
        initials: "ZK",
    },
    {
        id: 2,
        name: "Diah Novitasari",
        role: "Ibu Menyusui",
        content: "dear Mum and Hun, Pak Rizky, terima kasih banyak atas jasanya, yg saya pakai selama kurang lebih 6 bulan. berkat penyewaan freezer ini, saya bisa simpan stok utk ASIP anak saya. freezernya dlm kondisi baik dan berfungsi baik, selama saya sewa, tidak ada masalah. penyewa pun profesional, sangat ramah dan customer oriented. semoga sukses selalu usahanya.",
        rating: 5,
        initials: "DN",
    },
    {
        id: 3,
        name: "Mellisa Arfiany Shanur",
        role: "Pelanggan Setia",
        content: "Saya sudah 2x sewa freezer asi di sini. Saya senang karena freezer nya yang deep freezer (buka atas), bunga es nya nggak terlalu banyak dibandingkan dengan yang buka depan, kalaupun banyak ya karena sudah berbulan2 blm dibersihkan, lalu owner nya baik, tolerance kalau saya suka telat transfer heheh.. dan yang paling utama harga sewa nya murah dibanding yang lainnya.. no need deposit, sepertinya si bapak owner memegang sistem “kepercayaan”. Alhamdulillah selalu happy. Anak pertama saya sewa sekitar 1,5tahun. Anak kedua saya sewa 1 tahun saja.. sukses selalu ya usahakanya pak..",
        rating: 5,
        initials: "MS",
    },
    {
        id: 4,
        name: "Annisa Septiyani",
        role: "Ibu Menyusui",
        content: "Tau tempat penyewaan freezer ini dari ipar dan ikutan sewa juga. Ownernya super baik, ramah banget, selalu ingetin biaya sewa dengan bahasa yg halus banget, sampe gak enak sendiri kalo belum transfer hehe. Naaah yang dicari ibu-ibu nih, AFFORDABLE RENT COST! Walaupun pengirimannya dari Depok tapi bisa juga dianter ke daerah Ciledug dengan aman.\n\nTerima kasih Mum n Hun sudah jadi tempat penyimpanan asip anak saya selama 1 tahun 1 bulan. Agak sedih sih pas mau balikin freezer. Sukses dan berkah terus untuk owner& para kurir Mum n Hun.",
        rating: 5,
        initials: "AS",
    },
    {
        id: 5,
        name: "Siti Rohmani",
        role: "Pelanggan Happy",
        content: "pertama kalinya sewa freezer disini alhamdulillah sangat terbantu..anak masih bisa full ASIP meski jauh dr ibunya yaaa walaupun ga bisa smp 2th 😥..respon owner nya sangat ramah dan cepat. terima kasih banyak next mau sewa lg disini kl ad baby lg hehehe sukses terus usaha nya aamiin..",
        rating: 5,
        initials: "SR",
    },
    {
        id: 6,
        name: "Twins Fatih Fatimah",
        role: "Ibu Bayi Kembar",
        content: "Alhamdulillah saya bbisa berikan ASI full untuk baby kembar, krn bantuan sewa freezer dengan harga murah dan terjangkau...\nTerimakasih pelayanan baik fast respon, selama 22 bula sewa freezer tidak pernah rusak, oke Terimakasih",
        rating: 5,
        initials: "TF",
    },
    {
        id: 7,
        name: "Firsia Anggraini",
        role: "Ibu Menyusui",
        content: "Alhamdulillah banget bisa dpt tempat penyewaan freezer yang murah banget harga nya, ga ribet harus pake banyak persyaratan, atau dp duluan. Langsung di anter bahkan di taro di ruangan yg disediain. Watt nya kecil. Kembang es nya juga sedikit. Menolong banget buat busui.",
        rating: 5,
        initials: "FA",
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
        answer: "mulai dari Rp 100.000",
    },
    {
        question: "Area mana saja yang dijangkau?",
        answer: "Kami melayani seluruh wilayah Jakarta (Selatan, Barat, Timur, Utara, Pusat), Bogor, Depok, Tangerang (termasuk Bintaro, BSD, Serpong, Tangerang Selatan, Ciputat, Cinere), dan Bekasi.",
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
