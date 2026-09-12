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
        <div className="relative rounded-3xl sm:rounded-[2rem] overflow-hidden shadow-[0_20px_50px_-15px_rgba(40,30,25,0.15)] border-2 sm:border-[3px] border-white/95 ring-1 ring-[#281E19]/10 aspect-[16/10] sm:aspect-[16/11] max-h-[225px] xs:max-h-[245px] sm:max-h-[325px] lg:max-h-[385px] bg-[#F7F3EE] w-full mx-auto">
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
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px"
                            className="object-cover"
                            priority={idx === 0}
                        />
                        {/* Vignette Gradient for Depth */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                        {/* Subtle Floating Bottom Badge */}
                        <div className="absolute bottom-2.5 sm:bottom-3.5 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 flex items-center justify-between pointer-events-none gap-2 z-10">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[#281E19] text-[10.5px] sm:text-xs font-semibold shadow-sm border border-white/80 truncate">
                                <Sparkles className="w-3.5 h-3.5 text-[#C87860] shrink-0" strokeWidth={1.75} />
                                <span className="truncate">{image.caption}</span>
                            </span>
                            <span className="tabular-nums text-[10px] sm:text-[11px] font-bold text-white/95 drop-shadow-sm px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-xs border border-white/20 shrink-0">
                                0{idx + 1} / 04
                            </span>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    )
}

