import Link from "next/link"
import { Check } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { WHATSAPP_LINK } from "@/lib/constants"

interface PricingCardProps {
    duration: string
    price: string
    features: string[]
    isPopular?: boolean
    ctaText?: string
    className?: string
}

export function PricingCard({
    duration,
    price,
    features,
    isPopular = false,
    ctaText = "Sewa Sekarang",
    className,
}: PricingCardProps) {
    return (
        <Card
            className={cn(
                "relative overflow-hidden transition-all duration-300 h-full flex flex-col",
                isPopular
                    ? "border-coral-400 border-2 shadow-lg scale-105 z-10"
                    : "border-border hover:shadow-md",
                className
            )}
        >
            {/* Popular Badge */}
            {isPopular && (
                <div className="absolute top-0 inset-x-0 flex justify-center -mt-3">
                    <Badge className="bg-coral-500 hover:bg-coral-600 text-white text-xs px-4 py-1 rounded-full shadow-sm">
                        POPULER
                    </Badge>
                </div>
            )}

            <CardHeader className={cn("text-center pb-2", isPopular ? "pt-8" : "pt-6")}>
                {/* Duration */}
                <h3 className="text-lg font-bold text-neutral-800">
                    {duration}
                </h3>

                {/* Price */}
                <div className="mt-2">
                    <span className="text-3xl lg:text-4xl font-extrabold text-neutral-900">
                        {price}
                    </span>
                </div>
            </CardHeader>

            <CardContent className="pt-4 flex-grow">
                {/* Features List */}
                <ul className="space-y-3">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                            <div className="mt-0.5 rounded-full bg-teal-100 p-0.5">
                                <Check className="h-3 w-3 text-teal-600" />
                            </div>
                            <span className="text-sm text-muted-foreground font-medium">
                                {feature}
                            </span>
                        </li>
                    ))}
                </ul>
            </CardContent>

            <CardFooter className="pt-4 pb-6 px-6">
                <Button
                    asChild
                    className={cn(
                        "w-full rounded-full font-semibold shadow-sm",
                        isPopular
                            ? "bg-teal-600 hover:bg-teal-700 text-white"
                            : "bg-teal-500 hover:bg-teal-600 text-white"
                    )}
                >
                    <Link href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                        {ctaText}
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}
