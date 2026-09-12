import {
    Calendar,
    Banknote,
    ShieldCheck,
    Truck,
    Star,
    Snowflake,
    Wallet,
    Clock,
    Sparkles,
    type LucideIcon,
    BadgeDollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
    "BadgeDollarSign": BadgeDollarSign,
    "calendar": Calendar,
    "banknote": Banknote,
    "shield-check": ShieldCheck,
    "truck": Truck,
    "star": Star,
    "snowflake": Snowflake,
    "wallet": Wallet,
    "clock": Clock,
    "sparkles": Sparkles,
}

interface BenefitCardProps {
    icon: string
    title: string
    description: string
    className?: string
}

export function BenefitCard({
    icon,
    title,
    description,
    className,
}: BenefitCardProps) {
    const IconComponent = iconMap[icon] || Sparkles

    return (
        <div
            className={cn(
                "group relative bg-white/95 backdrop-blur-sm border border-stone-200/80 hover:border-[#2E5650]/40 p-7 sm:p-8 rounded-3xl transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-1.5 shadow-[0_4px_20px_rgba(40,30,25,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(46,86,80,0.12)] flex flex-col items-start",
                className
            )}
        >
            {/* Icon Box */}
            <div className="w-14 h-14 rounded-2xl bg-[#2E5650]/10 border border-[#2E5650]/15 flex items-center justify-center text-[#2E5650] mb-5 group-hover:scale-105 group-hover:bg-[#2E5650] group-hover:border-[#2E5650] group-hover:text-white transition-[transform,background-color,color] duration-300 ease-[cubic-bezier(0.2,0,0,1)]">
                <IconComponent
                    size={24}
                    strokeWidth={1.8}
                />
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-[#281E19] mb-2.5 group-hover:text-[#2E5650] transition-colors leading-snug text-balance">
                {title}
            </h3>

            {/* Description */}
            <p className="text-[#382821]/75 leading-relaxed text-sm text-pretty">
                {description}
            </p>
        </div>
    )
}


