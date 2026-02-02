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
    type LucideIcon,
    BadgeDollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Icon mapping - extended to match mockup features
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
    const IconComponent = iconMap[icon] || Star

    return (
        <div
            className={cn(
                "group relative bg-white/40 hover:bg-white border border-white/60 hover:border-white p-8 rounded-[2rem] transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-stone-200/50 flex flex-col items-start backdrop-blur-sm",
                className
            )}
        >
            {/* Icon Box - Gradient with hover effects */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-white shadow-sm flex items-center justify-center text-[#C48B77] mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <IconComponent
                    size={28}
                    strokeWidth={1.5}
                    className="group-hover:text-[#466A68] transition-colors"
                />
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-[#382821] mb-3 group-hover:text-[#466A68] transition-colors">
                {title}
            </h3>

            {/* Description */}
            <p className="text-[#382821]/70 leading-relaxed text-sm mb-4">
                {description}
            </p>

            {/* Decorative line - expands on hover */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mt-auto group-hover:w-full group-hover:bg-[#466A68]/20 transition-all duration-500" />
        </div>
    )
}

