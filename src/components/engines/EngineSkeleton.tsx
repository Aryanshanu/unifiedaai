import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface EngineSkeletonProps {
  showMetrics?: boolean;
  showResults?: boolean;
}

export function EngineSkeleton({ showMetrics = true, showResults = true }: EngineSkeletonProps) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Model Selector Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="pt-6">
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid Skeleton */}
      {showMetrics && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-48" />
            </div>
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Skeleton */}
      {showResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-2 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function EngineHeaderSkeleton() {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-6 w-36" />
    </div>
  );
}
