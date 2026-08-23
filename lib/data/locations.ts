// Sumber data lokasi untuk halaman SEO lokal "Sewa Freezer ASI [Kota]".
//
// ATURAN ANTI-DUPLIKAT / ANTI-DOORWAY:
// Setiap lokasi WAJIB memiliki konten yang benar-benar unik & substantif
// (intro, coverageAreas, deliveryEstimate, localTestimonial, faq). Jangan
// membuat entri baru yang hanya mengganti nama kota tanpa konten spesifik —
// itu berisiko dianggap doorway page oleh Google.
//
// Hanya tambahkan kota yang benar-benar dilayani secara operasional.

export type LocationFaq = {
  question: string
  answer: string
}

export type LocationTestimonial = {
  name: string
  area: string
  text: string
}

export type Location = {
  /** Segmen URL, contoh: "tangerang" -> /sewa-freezer-asi/tangerang */
  slug: string
  /** Nama kota untuk H1/judul, contoh: "Tangerang" */
  city: string
  /** Provinsi/wilayah administratif */
  region: string
  /** Paragraf pembuka unik & spesifik kota (dipakai di H1 area & GEO) */
  intro: string
  /** Kecamatan/area yang dilayani di kota ini (konten unik) */
  coverageAreas: string[]
  /** Estimasi waktu antar dari gudang terdekat */
  deliveryEstimate: string
  /** Estimasi ongkir antar */
  deliveryFee: string
  /** Patokan lokal untuk memperkuat sinyal geografis (opsional) */
  landmarks?: string[]
  /** Testimoni pelanggan dari kota ini (opsional tapi sangat dianjurkan) */
  localTestimonial?: LocationTestimonial
  /** FAQ spesifik lokasi — gunakan pertanyaan natural (kuat untuk GEO) */
  faq: LocationFaq[]
  /** Koordinat pusat kota untuk schema GeoCoordinates */
  geo: { lat: number; lng: number }
}

export const LOCATIONS: Location[] = [
  {
    slug: "tangerang",
    city: "Tangerang",
    region: "Banten",
    intro:
      "Sewa freezer ASI di Tangerang kini lebih praktis. Kami mengantar unit freezer ASI steril langsung ke rumah Anda di seluruh Kota Tangerang, tanpa deposit dan bergaransi unit selama masa sewa.",
    coverageAreas: ["Cikupa", "Ciledug", "Karawaci", "Cipondoh", "Batuceper", "Periuk", "Neglasari"],
    deliveryEstimate: "1x24 jam sejak konfirmasi pesanan",
    deliveryFee: "mulai Rp100.000, gratis untuk beberapa area terdekat",
    landmarks: ["dekat Tangcity Mall", "sekitar Bandara Soekarno-Hatta", "area Cikokol"],
    localTestimonial: {
      name: "Annisa Septiyani",
      area: "Ciledug",
      text: "Pengiriman ke Ciledug aman dan cepat. Freezernya dingin stabil selama pemakaian dan owner-nya ramah banget.",
    },
    faq: [
      {
        question: "Berapa biaya antar sewa freezer ASI ke Tangerang?",
        answer:
          "Biaya antar ke area Kota Tangerang mulai Rp100.000, dan gratis untuk beberapa area yang dekat dengan gudang kami. Detail ongkir final akan diinformasikan admin saat konfirmasi alamat.",
      },
      {
        question: "Area Tangerang mana saja yang dilayani sewa freezer ASI?",
        answer:
          "Kami melayani Cikupa, Ciledug, Karawaci, Cipondoh, Batuceper, Periuk, Neglasari, dan sekitarnya di Kota Tangerang.",
      },
      {
        question: "Berapa lama pengiriman freezer ASI di Tangerang?",
        answer:
          "Unit diantar dalam 1x24 jam sejak pesanan dikonfirmasi, langsung dipasang dan siap dipakai di rumah Anda.",
      },
    ],
    geo: { lat: -6.1783, lng: 106.6319 },
  },
  {
    slug: "tangerang-selatan",
    city: "Tangerang Selatan",
    region: "Banten",
    intro:
      "Layanan sewa freezer ASI Tangerang Selatan (Tangsel) untuk ibu menyusui di BSD, Bintaro, dan sekitarnya. Unit food-grade steril, hemat listrik, dan siap antar tanpa deposit.",
    coverageAreas: ["BSD City", "Bintaro Jaya", "Serpong", "Ciputat", "Alam Sutera", "Pamulang", "Pondok Aren"],
    deliveryEstimate: "1x24 jam, prioritas untuk area BSD & Bintaro",
    deliveryFee: "mulai Rp100.000, sering gratis untuk BSD/Serpong",
    landmarks: ["dekat AEON Mall BSD", "sekitar Bintaro Xchange", "area The Breeze BSD"],
    localTestimonial: {
      name: "Diah Novitasari",
      area: "Serpong",
      text: "Sewa 6 bulan di area Serpong, freezer selalu berfungsi baik untuk stok ASIP anak saya. Pelayanan profesional.",
    },
    faq: [
      {
        question: "Apakah melayani sewa freezer ASI di BSD dan Bintaro?",
        answer:
          "Ya, BSD City dan Bintaro Jaya adalah area prioritas kami di Tangerang Selatan dengan respon cepat dan ongkir sering gratis.",
      },
      {
        question: "Berapa harga sewa freezer ASI di Tangerang Selatan?",
        answer:
          "Harga sewa mulai Rp160.000 untuk 1 bulan, Rp325.000 untuk 3 bulan, dan Rp550.000 untuk 6 bulan. Sama untuk seluruh area Tangsel, tanpa deposit.",
      },
      {
        question: "Area Tangsel mana saja yang dijangkau?",
        answer:
          "Kami melayani BSD City, Bintaro Jaya, Serpong, Ciputat, Alam Sutera, Pamulang, dan Pondok Aren.",
      },
    ],
    geo: { lat: -6.2884, lng: 106.7176 },
  },
  {
    slug: "depok",
    city: "Depok",
    region: "Jawa Barat",
    intro:
      "Sewa freezer ASI Depok terdekat dengan respon cepat. Gudang kami berlokasi strategis untuk melayani seluruh Kota Depok, sehingga pengiriman unit steril bisa lebih cepat dan hemat ongkir.",
    coverageAreas: ["Margonda", "Cinere", "Sawangan", "Cimanggis", "Cibubur", "Beji", "Tapos", "Limo"],
    deliveryEstimate: "same-day untuk area dekat gudang, maksimal 1x24 jam",
    deliveryFee: "sering gratis karena gudang berada di area Depok",
    landmarks: ["dekat Margo City", "sekitar Universitas Indonesia", "area Cinere Mall"],
    localTestimonial: {
      name: "Firsia Anggraini",
      area: "Margonda",
      text: "Langsung diantar bahkan ditaruh di ruangan yang disediakan. Watt-nya kecil, kembang esnya sedikit. Menolong banget buat busui.",
    },
    faq: [
      {
        question: "Apakah pengiriman freezer ASI di Depok gratis?",
        answer:
          "Karena gudang kami berada di area Depok, banyak lokasi di Kota Depok mendapatkan pengiriman gratis atau ongkir sangat rendah. Admin akan konfirmasi sesuai alamat Anda.",
      },
      {
        question: "Berapa lama antar freezer ASI ke Depok?",
        answer:
          "Untuk area dekat gudang bisa same-day, dan maksimal 1x24 jam untuk seluruh Kota Depok.",
      },
      {
        question: "Area Depok mana saja yang dilayani?",
        answer:
          "Kami melayani Margonda, Cinere, Sawangan, Cimanggis, Cibubur, Beji, Tapos, dan Limo.",
      },
    ],
    geo: { lat: -6.4025, lng: 106.7942 },
  },
  {
    slug: "bekasi",
    city: "Bekasi",
    region: "Jawa Barat",
    intro:
      "Layanan rental kulkas ASI Bekasi bergaransi unit dan hemat listrik. Kami mengantar freezer ASI steril ke Kota dan Kabupaten Bekasi agar stok ASIP Si Kecil tetap terjaga.",
    coverageAreas: ["Bekasi Barat", "Bekasi Timur", "Galaxy", "Harapan Indah", "Tambun", "Cikarang", "Jatiasih"],
    deliveryEstimate: "1x24 jam sejak konfirmasi",
    deliveryFee: "mulai Rp100.000, menyesuaikan jarak (Cikarang sedikit lebih tinggi)",
    landmarks: ["dekat Summarecon Mall Bekasi", "area Galaxy", "sekitar Grand Metropolitan"],
    localTestimonial: {
      name: "Twins Fatih Fatimah",
      area: "Bekasi",
      text: "Bisa berikan ASI full untuk bayi kembar berkat sewa freezer harga murah. 22 bulan sewa tidak pernah rusak.",
    },
    faq: [
      {
        question: "Apakah melayani sewa freezer ASI sampai Cikarang?",
        answer:
          "Ya, kami melayani hingga Cikarang dan Tambun. Ongkir untuk area jauh seperti Cikarang sedikit lebih tinggi dan akan diinformasikan admin sebelum pengiriman.",
      },
      {
        question: "Berapa biaya sewa freezer ASI di Bekasi?",
        answer:
          "Harga sewa mulai Rp160.000/bulan, tanpa deposit, sudah termasuk garansi unit selama masa pemakaian. Biaya antar dihitung terpisah mulai Rp100.000.",
      },
      {
        question: "Area Bekasi mana saja yang dijangkau?",
        answer:
          "Kami melayani Bekasi Barat, Bekasi Timur, Galaxy, Harapan Indah, Tambun, Cikarang, dan Jatiasih.",
      },
    ],
    geo: { lat: -6.2383, lng: 106.9756 },
  },
  {
    slug: "jakarta-selatan",
    city: "Jakarta Selatan",
    region: "DKI Jakarta",
    intro:
      "Sewa freezer ASI Jakarta Selatan dengan pengantaran cepat langsung ke rumah. Cocok untuk ibu bekerja di area Jaksel yang butuh penyimpanan ASI perah higienis dan praktis.",
    coverageAreas: ["Kebayoran Baru", "Pondok Indah", "Cilandak", "Tebet", "Pancoran", "Jagakarsa", "Kemang"],
    deliveryEstimate: "1x24 jam sejak konfirmasi",
    deliveryFee: "mulai Rp100.000 menyesuaikan area",
    landmarks: ["dekat Pondok Indah Mall", "area Kemang", "sekitar Blok M"],
    localTestimonial: {
      name: "Siti Rohmani",
      area: "Jakarta Selatan",
      text: "Pertama kali sewa freezer di sini, alhamdulillah sangat terbantu. Anak tetap full ASIP. Respon owner ramah dan cepat.",
    },
    faq: [
      {
        question: "Berapa harga sewa freezer ASI di Jakarta Selatan?",
        answer:
          "Harga sewa mulai Rp160.000 untuk 1 bulan, tanpa deposit, dan sudah bergaransi unit. Biaya antar mulai Rp100.000 menyesuaikan area di Jaksel.",
      },
      {
        question: "Apakah bisa antar ke apartemen di Jakarta Selatan?",
        answer:
          "Bisa. Kami rutin mengantar ke rumah maupun apartemen di area Jaksel. Pastikan akses lift dan izin masuk unit tersedia saat pengiriman.",
      },
      {
        question: "Area Jakarta Selatan mana saja yang dilayani?",
        answer:
          "Kami melayani Kebayoran Baru, Pondok Indah, Cilandak, Tebet, Pancoran, Jagakarsa, dan Kemang.",
      },
    ],
    geo: { lat: -6.2615, lng: 106.8106 },
  },
  {
    slug: "bogor",
    city: "Bogor",
    region: "Jawa Barat",
    intro:
      "Sewa freezer ASI Bogor untuk ibu menyusui di Kota dan Kabupaten Bogor. Unit steril food-grade dengan suhu stabil, diantar langsung ke rumah tanpa perlu deposit.",
    coverageAreas: ["Bogor Kota", "Cibinong", "Sentul", "Cileungsi", "Tajur", "Bojonggede"],
    deliveryEstimate: "1x24 jam, area jauh menyesuaikan jadwal kurir",
    deliveryFee: "mulai Rp100.000, menyesuaikan jarak dari gudang",
    landmarks: ["dekat Botani Square", "area Sentul City", "sekitar Kebun Raya Bogor"],
    localTestimonial: {
      name: "Mellisa Arfiany Shanur",
      area: "Bogor",
      text: "Sudah 2x sewa di sini karena freezernya deep freezer, bunga esnya sedikit, harga murah, dan tanpa deposit.",
    },
    faq: [
      {
        question: "Apakah melayani sewa freezer ASI di Kabupaten Bogor?",
        answer:
          "Ya, kami melayani Kota Bogor dan sebagian Kabupaten Bogor seperti Cibinong, Sentul, Cileungsi, dan Bojonggede. Ongkir menyesuaikan jarak.",
      },
      {
        question: "Berapa biaya sewa freezer ASI di Bogor?",
        answer:
          "Harga sewa mulai Rp160.000/bulan, tanpa deposit, bergaransi unit. Biaya antar mulai Rp100.000 tergantung jarak dari gudang.",
      },
      {
        question: "Area Bogor mana saja yang dijangkau?",
        answer:
          "Kami melayani Bogor Kota, Cibinong, Sentul, Cileungsi, Tajur, dan Bojonggede.",
      },
    ],
    geo: { lat: -6.5971, lng: 106.806 },
  },
]

/** Cari satu lokasi berdasarkan slug. */
export function getLocation(slug: string): Location | undefined {
  return LOCATIONS.find((location) => location.slug === slug)
}

/** Ambil lokasi lain (tetangga) untuk internal linking, tanpa slug tertentu. */
export function getOtherLocations(excludeSlug: string, limit = 4): Location[] {
  return LOCATIONS.filter((location) => location.slug !== excludeSlug).slice(0, limit)
}
