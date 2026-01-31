import {
    PiggyBank,
    Calendar,
    Banknote,
    ShieldCheck,
    Truck,
    Star,
    type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
    "piggy-bank": PiggyBank,
    "calendar": Calendar,
    "banknote": Banknote,
    "shield-check": ShieldCheck,
    "truck": Truck,
    "star": Star,
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
                "flex flex-col items-center text-center p-6",
                className
            )}
        >
            {/* Icon Circle */}
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                <IconComponent className="h-8 w-8 text-teal-600" />
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-foreground mb-2">
                {title}
            </h3>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
            </p>
        </div>
    )
}
