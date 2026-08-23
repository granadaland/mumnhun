"use client"

import { useState } from "react"
import Image from "next/image"
import { Play } from "lucide-react"

interface VideoFacadeProps {
    videoId: string
    title: string
    coverImage?: string
}

export function VideoFacade({
    videoId,
    title,
    coverImage = "https://res.cloudinary.com/dvqcs0zqi/image/upload/v1769914192/Sewa_Freezer_ASI_Jakarta_g6mjoz.webp"
}: VideoFacadeProps) {
    const [isPlaying, setIsPlaying] = useState(false)

    if (isPlaying) {
        return (
            <div className="relative w-full aspect-video rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-stone-900/15 bg-stone-900 border-2 border-white ring-1 ring-[#C87860]/30">
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
        <div className="relative w-full aspect-video rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-stone-900/10 border-2 md:border-4 border-white ring-1 ring-[#C87860]/30 bg-stone-900 group/btn">
            {/* Cover Image */}
            <Image
                src={coverImage}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/20" />

            {/* Play Button Container */}
            <button
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer group focus:outline-none z-10"
                aria-label={`Putar video: ${title}`}
            >
                {/* Main play circle */}
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-white text-[#2E5650] flex items-center justify-center shadow-2xl transition-transform duration-200 group-hover:scale-105 active:scale-95">
                    <Play className="w-5 h-5 md:w-8 md:h-8 fill-[#2E5650] ml-0.5 md:ml-1" />
                </div>
            </button>
        </div>
    )
}


