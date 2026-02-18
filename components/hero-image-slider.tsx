"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { Autoplay, EffectFade } from "swiper/modules"
import Image from "next/image"

import "swiper/css"
import "swiper/css/effect-fade"

const HERO_IMAGES = [
    {
        src: "https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769914192/Sewa_Freezer_ASI_Jakarta_g6mjoz.webp",
        alt: "Sewa Freezer ASI Jakarta",
    },
    {
        src: "https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769976612/Sewa_Freezer_ASI_Terdekat_m4zp5w.webp",
        alt: "Ibu dan Bayi Bahagia",
    },
    {
        src: "https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769978885/Rental_Kulkas_ASI_uimlbz.webp",
        alt: "Kasih Sayang Ibu",
    },
    {
        src: "https://res.cloudinary.com/dvqcs0zqi/image/upload/v1771016767/Layanan_Sewa_Freezer_ASI_Jakarta_gdstef.webp",
        alt: "Kenyamanan Bayi",
    }
]

export function HeroImageSlider() {
    return (
        <div className="relative rounded-[3rem] overflow-hidden shadow-2xl shadow-stone-900/10 border-8 border-white/40 aspect-[4/3] transform transition-transform duration-700 hover:scale-[1.01]">
            <Swiper
                modules={[Autoplay, EffectFade]}
                effect="fade"
                autoplay={{
                    delay: 4000,
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
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                            priority={idx === 0}
                        />
                        {/* Gradient Overlay applied to each slide to ensure text readability if needed, 
                            but keeping it subtle as per original design */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    )
}
