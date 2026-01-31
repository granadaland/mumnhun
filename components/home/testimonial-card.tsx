import Image from "next/image"
import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface TestimonialCardProps {
    name: string
    quote: string
    rating: number
    image?: string
    className?: string
}

export function TestimonialCard({
    name,
    quote,
    rating,
    image,
    className,
}: TestimonialCardProps) {
    // Ensure rating is between 1-5
    const clampedRating = Math.min(5, Math.max(1, rating))

    // Get initials for avatar fallback
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

    return (
        <Card
            className={cn(
                "bg-cream-100 border-cream-200",
                className
            )}
        >
            <CardContent className="p-6">
                {/* Quote */}
                <blockquote className="text-foreground italic mb-4 leading-relaxed">
                    &ldquo;{quote}&rdquo;
                </blockquote>

                {/* Rating Stars */}
                <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                            key={i}
                            className={cn(
                                "h-4 w-4",
                                i < clampedRating
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-gray-200 text-gray-200"
                            )}
                        />
                    ))}
                    <span className="text-sm text-muted-foreground ml-1">
                        {clampedRating}.0
                    </span>
                </div>

                {/* Customer Info */}
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        {image && <AvatarImage src={image} alt={name} />}
                        <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-medium">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">
                        {name}
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
