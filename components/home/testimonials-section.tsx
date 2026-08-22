"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Star, Quote, CheckCircle2 } from "lucide-react"
import { TESTIMONIALS } from "@/lib/constants"
import { Container } from "@/components/layout/container"

const AUTO_SLIDE_INTERVAL = 6000

export function TestimonialsSection() {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(true)
    const [isPaused, setIsPaused] = useState(false)

    const changeSlide = useCallback((newIndex: number) => {
        setIsVisible(false)
        setTimeout(() => {
            setCurrentIndex(newIndex)
            setIsVisible(true)
        }, 200)
    }, [])

    const handleNext = useCallback(() => {
        const nextIndex = (currentIndex + 1) % TESTIMONIALS.length
        changeSlide(nextIndex)
    }, [currentIndex, changeSlide])

    const handlePrev = useCallback(() => {
        const prevIndex = (currentIndex - 1 + TESTIMONIALS.length) % TESTIMONIALS.length
        changeSlide(prevIndex)
    }, [currentIndex, changeSlide])

    // Auto-slide
    useEffect(() => {
        if (isPaused) return
        const intervalId = setInterval(handleNext, AUTO_SLIDE_INTERVAL)
        return () => clearInterval(intervalId)
    }, [isPaused, handleNext])

    const testimonial = TESTIMONIALS[currentIndex]

    return (
        <section
            className="py-20 md:py-28 px-4 sm:px-6 relative overflow-hidden bg-[#F7F3EE]"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            aria-labelledby="testimonials-heading"
        >
            <Container>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#2E5650]/10 text-[#2E5650] text-xs font-bold uppercase tracking-wider mb-3">
                            <Star className="w-3.5 h-3.5 fill-[#2E5650]" />
                            Pengalaman Nyata Ibu
                        </div>
                        <h2 id="testimonials-heading" className="text-3xl md:text-5xl font-bold text-[#281E19] tracking-tight">
                            Cerita Bahagia Mums
                        </h2>
                        <p className="text-sm md:text-base text-[#382821]/70 mt-2 max-w-lg">
                            Kepercayaan lebih dari 5.000+ ibu menyusui di Jabodetabek yang telah merasakan kemudahan sewa freezer ASI kami.
                        </p>
                    </div>

                    {/* Desktop Navigation & Dots */}
                    <div className="hidden md:flex items-center gap-5">
                        <div className="flex gap-1.5">
                            {TESTIMONIALS.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => changeSlide(idx)}
                                    className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex
                                        ? "bg-[#2E5650] w-7"
                                        : "bg-stone-300 hover:bg-stone-400 w-2"
                                        }`}
                                    aria-label={`Lihat testimoni ke-${idx + 1}`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handlePrev}
                                className="w-11 h-11 rounded-full bg-white border border-stone-200 text-[#281E19] hover:bg-[#2E5650] hover:text-white hover:border-[#2E5650] active:scale-95 transition-all flex items-center justify-center shadow-xs"
                                aria-label="Testimoni sebelumnya"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="w-11 h-11 rounded-full bg-white border border-stone-200 text-[#281E19] hover:bg-[#2E5650] hover:text-white hover:border-[#2E5650] active:scale-95 transition-all flex items-center justify-center shadow-xs"
                                aria-label="Testimoni berikutnya"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Testimonial Card */}
                <div className="relative">
                    <div className="bg-white rounded-3xl md:rounded-[2.5rem] p-6 sm:p-10 md:p-14 shadow-[0_12px_40px_-12px_rgba(56,40,33,0.06)] border border-stone-200/80 min-h-[320px] md:min-h-[260px] flex items-center">
                        <div
                            className={`flex flex-col md:flex-row gap-6 md:gap-12 items-center md:items-start w-full transition-all duration-300 ${isVisible
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 translate-y-2"
                                }`}
                        >
                            {/* Avatar / Initial Badge */}
                            <div className="shrink-0 flex flex-col items-center">
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-gradient-to-br from-[#2E5650] to-[#1F3E3A] text-white flex items-center justify-center shadow-md border-2 border-white text-2xl md:text-3xl font-bold">
                                    {testimonial.initials}
                                </div>
                                <div className="flex text-amber-400 mt-3 gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 text-center md:text-left">
                                <p className="text-[#281E19] text-base md:text-xl lg:text-2xl font-medium leading-relaxed mb-6 italic tracking-tight">
                                    &ldquo;{testimonial.content}&rdquo;
                                </p>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-2 pt-2 border-t border-stone-100">
                                    <h3 className="text-base font-bold text-[#281E19]">
                                        {testimonial.name}
                                    </h3>
                                    <span className="hidden sm:inline text-stone-300">•</span>
                                    <p className="text-xs text-[#2E5650] font-semibold flex items-center justify-center md:justify-start gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {testimonial.role} (Penyewa Terverifikasi)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Navigation Controls */}
                    <div className="flex items-center justify-between mt-6 md:hidden">
                        <div className="flex gap-1.5">
                            {TESTIMONIALS.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => changeSlide(idx)}
                                    className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex
                                        ? "bg-[#2E5650] w-6"
                                        : "bg-stone-300 w-2"
                                        }`}
                                    aria-label={`Testimoni ke-${idx + 1}`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handlePrev}
                                className="w-10 h-10 bg-white rounded-full border border-stone-200 shadow-xs flex items-center justify-center text-[#281E19] active:scale-95"
                                aria-label="Sebelumnya"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="w-10 h-10 bg-white rounded-full border border-stone-200 shadow-xs flex items-center justify-center text-[#281E19] active:scale-95"
                                aria-label="Berikutnya"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </Container>
        </section>
    )
}

