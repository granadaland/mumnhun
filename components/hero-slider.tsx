'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, EffectFade } from 'swiper/modules'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'

interface HeroSlide {
    id: string
    title: string
    subtitle: string | null
    imageUrl: string | null
    ctaPrimaryText: string
    ctaPrimaryLink: string
    ctaSecondaryText: string | null
    ctaSecondaryLink: string | null
}

interface HeroSliderProps {
    slides: HeroSlide[]
}

export function HeroSlider({ slides }: HeroSliderProps) {
    if (!slides || slides.length === 0) {
        return null
    }

    return (
        <section className="relative w-full min-h-[600px] lg:min-h-[700px]">
            <Swiper
                modules={[Autoplay, Pagination, EffectFade]}
                effect="fade"
                autoplay={{
                    delay: 5000,
                    disableOnInteraction: false,
                }}
                pagination={{
                    clickable: true,
                    bulletClass: 'swiper-pagination-bullet !bg-white/60',
                    bulletActiveClass: 'swiper-pagination-bullet-active !bg-white',
                }}
                loop={slides.length > 1}
                className="h-full"
            >
                {slides.map((slide) => (
                    <SwiperSlide key={slide.id}>
                        <div className="relative w-full min-h-[600px] lg:min-h-[700px]">
                            {/* Background Image */}
                            {slide.imageUrl && (
                                <Image
                                    src={slide.imageUrl}
                                    alt={slide.title}
                                    fill
                                    sizes="100vw"
                                    className="object-cover"
                                    priority
                                />
                            )}

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

                            {/* Content */}
                            <div className="relative z-10 container mx-auto px-4 h-full min-h-[600px] lg:min-h-[700px] flex items-center">
                                <div className="max-w-2xl space-y-6">
                                    {/* Title */}
                                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                                        {slide.title}
                                    </h1>

                                    {/* Subtitle */}
                                    {slide.subtitle && (
                                        <p className="text-lg md:text-xl text-white/90 leading-relaxed">
                                            {slide.subtitle}
                                        </p>
                                    )}

                                    {/* CTA Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                        {/* Primary CTA */}
                                        <Button
                                            asChild
                                            size="lg"
                                            className="bg-teal-600 hover:bg-teal-700 text-white text-lg px-8 py-6"
                                        >
                                            <Link href={slide.ctaPrimaryLink}>
                                                {slide.ctaPrimaryText}
                                                <ArrowRight className="ml-2 h-5 w-5" />
                                            </Link>
                                        </Button>

                                        {/* Secondary CTA */}
                                        {slide.ctaSecondaryText && slide.ctaSecondaryLink && (
                                            <Button
                                                asChild
                                                size="lg"
                                                variant="outline"
                                                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-white/30 text-lg px-8 py-6"
                                            >
                                                <Link href={slide.ctaSecondaryLink}>
                                                    <MessageCircle className="mr-2 h-5 w-5" />
                                                    {slide.ctaSecondaryText}
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Custom Pagination Styling */}
            <style jsx global>{`
        .swiper-pagination {
          bottom: 2rem !important;
        }
        .swiper-pagination-bullet {
          width: 12px;
          height: 12px;
          opacity: 1;
        }
      `}</style>
        </section>
    )
}
