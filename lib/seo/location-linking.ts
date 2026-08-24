// Pemetaan artikel blog -> halaman layanan spesifik-lokasi (/sewa-freezer-asi/[slug]).
//
// TUJUAN SEO: artikel lama dengan kata kunci lokal ("sewa freezer ASI Bekasi", dsb.)
// bersaing (kanibalisasi) dengan halaman layanan per kota. Dengan menautkan setiap
// artikel yang cocok ke halaman lokasinya, authority artikel mengalir ke halaman
// transaksional tanpa mengubah konten tersimpan di database.
//
// PRESISI DI ATAS RECALL: pencocokan HANYA memakai slug, judul, dan focus keyword.
// Menyapu isi artikel akan salah menautkan artikel yang sekadar menyebut nama kota
// di dalam paragraf (mis. daftar harga antar-kota).

import { getLocation, type Location } from "@/lib/data/locations"

export type PostForLocationMatch = {
  slug: string
  title: string
  focusKeyword?: string | null
}

/**
 * Urutan entri = urutan prioritas. Entri yang lebih spesifik ("tangerang selatan",
 * area BSD/Bintaro) harus dicek sebelum entri generik ("tangerang") supaya judul
 * seperti "Sewa Freezer ASI BSD" jatuh ke halaman Tangerang Selatan, bukan Tangerang.
 */
const LOCATION_KEYWORD_RULES: ReadonlyArray<{ slug: string; patterns: RegExp[] }> = [
  {
    slug: "tangerang-selatan",
    patterns: [
      /tangerang selatan/i,
      /\btangsel\b/i,
      /\bbsd\b/i,
      /bintaro/i,
      /alam sutera/i,
      /\bserpong\b/i,
      /\bciputat\b/i,
      /\bpamulang\b/i,
      /pondok aren/i,
    ],
  },
  {
    slug: "jakarta-selatan",
    patterns: [
      /jakarta selatan/i,
      /\bjaksel\b/i,
      /\bkemang\b/i,
      /pondok indah/i,
      /\btebet\b/i,
      /kebayoran/i,
      /\bcilandak\b/i,
      // Halaman Jakarta yang kami miliki adalah Jaksel; judul ber-"jakarta" generik
      // (mis. slug artikel lama "sewa-freezer-asi-jakarta") diarahkan ke sana.
      /\bjakarta\b/i,
    ],
  },
  {
    slug: "bekasi",
    patterns: [/\bbekasi\b/i, /\bcikarang\b/i, /\btambun\b/i, /harapan indah/i, /\bgalaxy\b/i],
  },
  {
    slug: "depok",
    patterns: [/\bdepok\b/i, /margonda/i, /\bcinere\b/i, /\bsawangan\b/i, /\bciwangin\b/i, /\blimo\b/i],
  },
  {
    slug: "bogor",
    patterns: [/\bbogor\b/i, /\bcibinong\b/i, /\bsentul\b/i, /\bcileungsi\b/i, /bojonggede/i, /\btajur\b/i],
  },
  // Generik Tangerang paling akhir agar kalah dari "Tangerang Selatan".
  {
    slug: "tangerang",
    patterns: [/\btangerang\b/i, /\bkarawaci\b/i, /\bciledug\b/i, /\bcikupa\b/i, /\bcipondoh\b/i, /\bbatuceper\b/i],
  },
]

/**
 * Mengembalikan halaman lokasi yang relevan untuk sebuah artikel, atau null bila
 * tidak ada sinyal lokal yang cukup spesifik pada slug/judul/focus keyword.
 */
export function matchLocationForPost(post: PostForLocationMatch): Location | null {
  const haystack = [post.slug, post.title, post.focusKeyword]
    .map((value) => value?.toLowerCase() ?? "")
    .join(" ")

  if (!haystack.trim()) return null

  for (const rule of LOCATION_KEYWORD_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return getLocation(rule.slug) ?? null
    }
  }

  return null
}
