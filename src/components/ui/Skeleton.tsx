import { clsx } from 'clsx'

interface SkeletonProps {
    className?: string
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={clsx(
                'animate-pulse bg-gray-700/50 rounded',
                className
            )}
        />
    )
}

export function SkeletonCard() {
    return (
        <div className="rounded-xl overflow-hidden bg-gray-800/40 border border-gray-700/50">
            <Skeleton className="aspect-video w-full" />
            <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>
        </div>
    )
}

export function SkeletonStatCard() {
    return (
        <div className="relative overflow-hidden rounded-xl bg-gray-800/50 border border-gray-700/50 p-4">
            <Skeleton className="absolute top-0 left-0 right-0 h-1" />
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-16" />
                </div>
                <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
            </div>
        </div>
    )
}

export function SkeletonListItem() {
    return (
        <div className="px-6 py-4 flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
        </div>
    )
}

export function SkeletonActivityItem() {
    return (
        <div className="px-6 py-3 flex items-start gap-3">
            <Skeleton className="w-4 h-4 rounded mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-24" />
            </div>
        </div>
    )
}

interface SkeletonGridProps {
    count?: number
}

export function SkeletonMediaGrid({ count = 8 }: SkeletonGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    )
}
