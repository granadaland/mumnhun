"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { Autoplay, EffectFade } from "swiper/modules"
import Image from "next/image"
import { Sparkles } from "lucide-react"

import "swiper/css"
import "swiper/css/effect-fade"

const HERO_IMAGES = [
    {
        src: "https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769914192/Sewa_Freezer_ASI_Jakarta_g6mjoz.webp",
        alt: "Layanan Sewa Freezer ASI Terdekat Jabodetabek",
        caption: "Unit Bersih & Siap Antar"
    },
    {
        src: "https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769976612/Sewa_Freezer_ASI_Terdekat_m4zp5w.webp",
        alt: "Ibu Menyusui Tenang dengan Stok ASIP Terjaga",
        caption: "Nutrisi ASI Terjaga Sempurna"
    },
    {
        src: "https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769978885/Rental_Kulkas_ASI_uimlbz.webp",
        alt: "Rental Kulkas ASI Khusus Ibu Menyusui",
        caption: "Hemat Energi & Suhu Stabil"
    },
    {
        src: "https://res.cloudinary.com/dvqcs0zqi/image/upload/v1771016767/Layanan_Sewa_Freezer_ASI_Jakarta_gdstef.webp",
        alt: "Kenyamanan Bayi dengan Nutrisi ASI Maksimal",
        caption: "100% Sterilisasi Food-Grade"
    }
]

export function HeroImageSlider() {
    return (
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl shadow-stone-900/10 border-2 sm:border-4 border-white aspect-[4/3] sm:aspect-[16/11] max-h-[280px] sm:max-h-[340px] lg:max-h-[380px] bg-stone-100 w-full mx-auto">
            <Swiper
                modules={[Autoplay, EffectFade]}
                effect="fade"
                autoplay={{
                    delay: 4500,
                    disableOnInteraction: false,
                }}
                loop={true}
                className="absolute inset-0 w-full h-full"
            >
                {HERO_IMAGES.map((image, idx) => (
                    <SwiperSlide key={idx} className="w-full h-full relative">
                        <Image
                            src={image.src}
                            alt={image.alt}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 560px"
                            className="object-cover"
                            priority={idx === 0}
                        />
                        {/* Vignette Gradient for Depth */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

                        {/* Subtle Floating Bottom Badge */}
                        <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 flex items-center justify-between pointer-events-none gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[#281E19] text-[11px] sm:text-xs font-semibold shadow-md truncate">
                                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C87860] shrink-0" />
                                <span className="truncate">{image.caption}</span>
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-medium text-white/90 drop-shadow-sm px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-black/40 backdrop-blur-xs shrink-0">
                                0{idx + 1}/04
                            </span>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    )
}

