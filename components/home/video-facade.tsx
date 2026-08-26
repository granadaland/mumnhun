"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import { Logo } from "@/components/ui/logo"

interface VideoFacadeProps {
    videoId: string
    title: string
    coverImage?: string
}

export function VideoFacade({
    videoId,
    title,
}: VideoFacadeProps) {
    const [isPlaying, setIsPlaying] = useState(false)

    if (isPlaying) {
        return (
            <div className="relative w-full aspect-video rounded-2xl md:rounded-[2rem] overflow-hidden shadow-xl sm:shadow-2xl shadow-stone-900/15 bg-black border-2 border-white ring-1 ring-stone-200">
                <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&fs=1&playsinline=1`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full border-0"
                />
            </div>
        )
    }

    return (
        <div className="relative w-full aspect-video rounded-2xl md:rounded-[2rem] overflow-hidden shadow-[0_16px_40px_-15px_rgba(40,30,25,0.08)] border-2 md:border-4 border-white ring-1 ring-stone-200/80 bg-gradient-to-b from-white via-[#FAF7F4] to-white group/btn flex items-center justify-center select-none">
            {/* Subtle Ambient Radial Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(46,86,80,0.04)_0%,transparent_70%)] pointer-events-none" />

            {/* Full Logo on Pure White Surface */}
            <div className="relative z-0 flex items-center justify-center w-full px-6 sm:px-10 py-4 transition-transform duration-500 ease-out group-hover/btn:scale-[1.03]">
                <Logo
                    variant="default"
                    className="w-full max-w-[220px] xs:max-w-[260px] sm:max-w-[340px] md:max-w-[420px] h-auto drop-shadow-xs"
                />
            </div>

            {/* Play Button Trigger Overlay */}
            <button
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center cursor-pointer group focus:outline-none z-10 bg-black/[0.02] hover:bg-black/[0.04] transition-colors"
                aria-label={`Putar video: ${title}`}
            >
                {/* Main Play Circle with Pulse */}
                <div className="relative">
                    <div className="absolute -inset-2 rounded-full bg-[#2E5650]/15 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="w-13 h-13 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-[#2E5650] to-[#244742] text-white flex items-center justify-center shadow-lg shadow-[#2E5650]/30 transition-all duration-300 group-hover:scale-110 active:scale-95 border-2 sm:border-4 border-white">
                        <Play className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 fill-white text-white ml-0.5 sm:ml-1" />
                    </div>
                </div>

                {/* Subtitle / Watch Pill */}
                <span className="mt-2.5 sm:mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-stone-200/90 text-[#281E19] text-[10px] sm:text-xs font-bold shadow-2xs group-hover:border-[#2E5650]/40 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>Putar Video Profil</span>
                </span>
            </button>
        </div>
    )
}


