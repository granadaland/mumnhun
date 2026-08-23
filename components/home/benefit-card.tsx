import {
    PiggyBank,
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
                "group relative bg-white/90 backdrop-blur-sm border border-stone-200/80 hover:border-[#C87860]/40 p-7 sm:p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_36px_-8px_rgba(200,120,96,0.12)] flex flex-col items-start",
                className
            )}
        >
            {/* Icon Box */}
            <div className="w-14 h-14 rounded-2xl bg-[#2E5650]/10 border border-[#2E5650]/15 flex items-center justify-center text-[#2E5650] mb-5 group-hover:scale-110 group-hover:bg-[#C87860] group-hover:border-[#C87860] group-hover:text-white transition-all duration-300">
                <IconComponent
                    size={24}
                    strokeWidth={2}
                />
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-[#281E19] mb-2.5 group-hover:text-[#C87860] transition-colors leading-snug">
                {title}
            </h3>

            {/* Description */}
            <p className="text-[#382821]/70 leading-relaxed text-sm">
                {description}
            </p>
        </div>
    )
}


