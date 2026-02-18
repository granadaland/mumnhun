"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react"
import { TESTIMONIALS } from "@/lib/constants"
import { Container } from "@/components/layout/container"

const AUTO_SLIDE_INTERVAL = 5000 // 5 seconds

export function TestimonialsSection() {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(true)
    const [isPaused, setIsPaused] = useState(false)

    const changeSlide = useCallback((newIndex: number) => {
        setIsVisible(false)
        setTimeout(() => {
            setCurrentIndex(newIndex)
            setIsVisible(true)
        }, 300)
    }, [])

    const handleNext = useCallback(() => {
        const nextIndex = (currentIndex + 1) % TESTIMONIALS.length
        changeSlide(nextIndex)
    }, [currentIndex, changeSlide])

    const handlePrev = useCallback(() => {
        const prevIndex = (currentIndex - 1 + TESTIMONIALS.length) % TESTIMONIALS.length
        changeSlide(prevIndex)
    }, [currentIndex, changeSlide])

    // Auto-slide effect
    useEffect(() => {
        if (isPaused) return

        const intervalId = setInterval(() => {
            handleNext()
        }, AUTO_SLIDE_INTERVAL)

        return () => clearInterval(intervalId)
    }, [isPaused, handleNext])

    const testimonial = TESTIMONIALS[currentIndex]

    return (
        <section
            className="py-20 md:py-24 px-6 relative overflow-hidden bg-[#F0E7DB]"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Background blobs */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#C48B77]/5 rounded-full blur-3xl -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#466A68]/5 rounded-full blur-3xl translate-y-1/3" />

            <Container>
                <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
                    <div className="text-center md:text-left">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-[#466A68]/10 text-[#466A68] font-semibold text-sm mb-4">
                            Cerita Sukses
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold text-[#382821] tracking-tight mb-4">
                            Kata Mereka
                        </h2>
                        <p className="text-lg text-[#382821]/60 max-w-md">
                            Cerita kebahagiaan dari para ibu hebat yang telah kami bantu.
                        </p>
                    </div>

                    {/* Desktop Nav + Progress Dots */}
                    <div className="hidden md:flex items-center gap-6">
                        {/* Progress Dots */}
                        <div className="flex gap-2">
                            {TESTIMONIALS.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => changeSlide(idx)}
                                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === currentIndex
                                        ? "bg-[#466A68] w-8"
                                        : "bg-[#382821]/20 hover:bg-[#382821]/40"
                                        }`}
                                    aria-label={`Go to testimonial ${idx + 1}`}
                                />
                            ))}
                        </div>

                        {/* Nav Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handlePrev}
                                className="w-14 h-14 rounded-full border border-[#382821]/10 hover:bg-[#466A68] hover:text-white hover:border-[#466A68] transition-all flex items-center justify-center text-[#382821]/60"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={handleNext}
                                className="w-14 h-14 rounded-full border border-[#382821]/10 hover:bg-[#466A68] hover:text-white hover:border-[#466A68] transition-all flex items-center justify-center text-[#382821]/60"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    {/* Glass Card */}
                    <div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] p-8 md:p-16 shadow-soft border border-white/60 relative z-10 min-h-[420px] md:min-h-[350px] flex items-center">
                        <div
                            className={`flex flex-col md:flex-row gap-10 lg:gap-20 items-center w-full transition-all duration-300 ease-in-out ${isVisible
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 translate-y-4"
                                }`}
                        >
                            {/* Avatar Section - CSS Initials */}
                            <div className="shrink-0 relative group">
                                <div className="absolute inset-0 bg-gradient-to-tr from-[#466A68] to-[#C48B77] rounded-[2rem] blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
                                <div className="w-40 h-40 md:w-56 md:h-56 rounded-[2rem] bg-gradient-to-br from-[#466A68] to-[#2F4A48] shadow-lg border-4 border-white relative z-10 rotate-3 group-hover:rotate-0 transition-transform duration-500 flex items-center justify-center">
                                    <span className="text-white text-5xl md:text-7xl font-bold">
                                        {testimonial.initials}
                                    </span>
                                </div>
                                <div className="absolute -bottom-5 right-0 bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 z-20 whitespace-nowrap border border-gray-100">
                                    <div className="flex text-yellow-400">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={12} fill="currentColor" />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Content Section */}
                            <div className="flex-1 text-center md:text-left relative">
                                <Quote className="hidden md:block absolute -top-10 -left-6 text-[#466A68]/10 w-24 h-24 rotate-180" />

                                <p className="text-xl md:text-3xl text-[#382821] font-medium leading-relaxed mb-8 relative z-10 tracking-tight">
                                    &ldquo;{testimonial.content}&rdquo;
                                </p>

                                <div className="border-l-4 border-[#C48B77] pl-5 text-left inline-block">
                                    <h4 className="text-xl font-bold text-[#382821]">
                                        {testimonial.name}
                                    </h4>
                                    <p className="text-[#382821]/50 text-sm font-medium uppercase tracking-wider mt-1">
                                        {testimonial.role}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Nav + Progress Dots */}
                    <div className="flex flex-col items-center gap-4 mt-8 md:hidden">
                        {/* Progress Dots */}
                        <div className="flex gap-2">
                            {TESTIMONIALS.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => changeSlide(idx)}
                                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === currentIndex
                                        ? "bg-[#466A68] w-6"
                                        : "bg-[#382821]/20"
                                        }`}
                                    aria-label={`Go to testimonial ${idx + 1}`}
                                />
                            ))}
                        </div>

                        {/* Nav Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={handlePrev}
                                className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-[#382821] active:scale-95"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={handleNext}
                                className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-[#382821] active:scale-95"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </Container>
        </section>
    )
}

