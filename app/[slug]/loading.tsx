import { Skeleton } from "@/components/ui/skeleton"
import { Container } from "@/components/layout"

export default function BlogPostLoading() {
    return (
        <div className="py-8 md:py-12">
            <Container size="narrow">
                {/* Back Button */}
                <Skeleton className="h-10 w-40 mb-6" />

                {/* Header */}
                <div className="mb-8">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <Skeleton className="h-12 w-full mb-4" />
                    <Skeleton className="h-8 w-3/4 mb-4" />
                    <div className="flex gap-4">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                </div>

                {/* Featured Image */}
                <Skeleton className="aspect-video w-full rounded-lg mb-8" />

                {/* Content */}
                <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </Container>
        </div>
    )
}
