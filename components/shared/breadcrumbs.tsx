import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbItem {
    label: string
    href?: string
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                {/* Home */}
                <li>
                    <Link
                        href="/"
                        className="hover:text-mumnhun-600 transition-colors inline-flex items-center gap-1"
                    >
                        <Home className="h-4 w-4" />
                        <span className="sr-only">Beranda</span>
                    </Link>
                </li>

                {items.map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4" />
                        {item.href ? (
                            <Link
                                href={item.href}
                                className="hover:text-mumnhun-600 transition-colors"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-foreground font-medium">{item.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    )
}
