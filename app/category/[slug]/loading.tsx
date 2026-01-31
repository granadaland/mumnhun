import { Skeleton } from "@/components/ui/skeleton"
import { Container } from "@/components/layout"

export default function CategoryLoading() {
    return (
        <div className="py-12 md:py-16">
            <Container>
                {/* Header Skeleton */}
                <div className="text-center mb-12">
                    <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
                    <Skeleton className="h-10 w-48 mx-auto mb-4" />
                    <Skeleton className="h-5 w-64 mx-auto" />
                </div>

                {/* Posts Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-4">
                            <Skeleton className="aspect-video w-full rounded-lg" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ))}
                </div>
            </Container>
        </div>
    )
}
