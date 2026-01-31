import { cn } from "@/lib/utils"

interface ContainerProps {
    children: React.ReactNode
    className?: string
    size?: "default" | "narrow" | "wide"
}

export function Container({
    children,
    className,
    size = "default"
}: ContainerProps) {
    return (
        <div
            className={cn(
                "container mx-auto px-4",
                {
                    "max-w-4xl": size === "narrow",      // For blog content
                    "max-w-7xl": size === "default",     // Standard width
                    "max-w-screen-2xl": size === "wide", // Full width
                },
                className
            )}
        >
            {children}
        </div>
    )
}
