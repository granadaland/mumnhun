import { describe, expect, it } from "vitest"
import { matchLocationForPost } from "@/lib/seo/location-linking"

function post(overrides: Partial<{ slug: string; title: string; focusKeyword: string }> = {}) {
    return {
        slug: overrides.slug ?? "contoh-artikel",
        title: overrides.title ?? "Contoh Artikel",
        focusKeyword: overrides.focusKeyword ?? null,
    }
}

describe("matchLocationForPost", () => {
    it("maps a Tangerang Selatan / BSD title to the Tangsel page, not generic Tangerang", () => {
        const result = matchLocationForPost(
            post({ slug: "sewa-freezer-asi-bsd-solusi-cerdas-mums-modern", title: "Sewa Freezer ASI BSD" })
        )
        expect(result?.slug).toBe("tangerang-selatan")
    })

    it("maps Bintaro and Pamulang titles to Tangerang Selatan as well", () => {
        expect(matchLocationForPost(post({ title: "Sewa Freezer ASI Bintaro Solusi Cerdas" }))?.slug).toBe(
            "tangerang-selatan"
        )
        expect(
            matchLocationForPost(
                post({
                    slug: "cara-memilih-tempat-sewa-freezer-asi-harga-terjangkau-di-pamulang",
                    title: "Tempat Sewa Freezer ASI di Pamulang",
                })
            )?.slug
        ).toBe("tangerang-selatan")
    })

    it("maps the legacy Jakarta article to the Jakarta Selatan service page", () => {
        const result = matchLocationForPost(
            post({ slug: "sewa-freezer-asi-jakarta", title: "Sewa Freezer ASI Jakarta" })
        )
        expect(result?.slug).toBe("jakarta-selatan")
    })

    it("maps Bekasi, Depok, and Bogor titles to their own pages", () => {
        expect(matchLocationForPost(post({ slug: "sewa-freezer-asi-bekasi", title: "Sewa Freezer ASI Bekasi" }))?.slug).toBe("bekasi")
        expect(matchLocationForPost(post({ title: "Rental Kulkas ASI Cikarang Bergaransi" }))?.slug).toBe("bekasi")
        expect(matchLocationForPost(post({ title: "Rental Freezer ASI Depok Anti Ribet" }))?.slug).toBe("depok")
        expect(matchLocationForPost(post({ title: "Tips Menyimpan ASI saat Tinggal di Bogor" }))?.slug).toBe("bogor")
    })

    it("maps a plain Tangerang title (without Selatan) to the Tangerang page", () => {
        const result = matchLocationForPost(
            post({ slug: "sewa-freezer-asi-tangerang-solusi-cerdas", title: "Sewa Freezer ASI Tangerang" })
        )
        expect(result?.slug).toBe("tangerang")
    })

    it("uses focusKeyword as an additional signal when title is neutral", () => {
        const result = matchLocationForPost(
            post({ title: "Pengalaman Menyimpan ASIP Enam Bulan", focusKeyword: "sewa freezer ASI Karawaci" })
        )
        expect(result?.slug).toBe("tangerang")
    })

    it("returns null for articles without any city-level signal", () => {
        expect(matchLocationForPost(post({ title: "7 Cara Meningkatkan Nafsu Makan Bayi" }))).toBeNull()
        expect(matchLocationForPost(post({ title: "Perbandingan Harga Sewa Freezer ASI di Berbagai Kota Indonesia" }))).toBeNull()
    })

    it("never matches on incidental city mentions inside body copy (only slug/title/focus are scanned)", () => {
        // Body content intentionally not part of PostForLocationMatch.
        const result = matchLocationForPost(post({ title: "Cara Aman Membawa ASI Beku Saat Perjalanan Jauh" }))
        expect(result).toBeNull()
    })
})
