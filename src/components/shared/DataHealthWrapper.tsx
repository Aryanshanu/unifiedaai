import { ReactNode, useEffect, useState } from "react";
import { HealthIndicator, HealthDot } from "./HealthIndicator";
import { HealthStatus } from "@/hooks/useSelfHealing";
import { toast } from "sonner";

interface DataHealthWrapperProps {
  children: ReactNode;
  isLoading: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  dataName?: string;
  showIndicator?: boolean;
}

export function DataHealthWrapper({
  children,
  isLoading,
  isError = false,
  error,
  onRetry,
  dataName = "data",
  showIndicator = true,
}: DataHealthWrapperProps) {
  const [status, setStatus] = useState<HealthStatus>("loading");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setStatus(retryCount > 0 ? "retrying" : "loading");
    } else if (isError) {
      setStatus("failed");
    } else {
      if (status === "retrying" || status === "failed") {
        toast.success(`${dataName} recovered`);
      }
      setStatus("healthy");
      setLastUpdated(new Date());
      setRetryCount(0);
    }
  }, [isLoading, isError, dataName, retryCount, status]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    onRetry?.();
  };

  return (
    <div className="relative">
      {showIndicator && (
        <div className="absolute top-0 right-0 z-10">
          <HealthIndicator
            status={status}
            lastUpdated={lastUpdated}
            retryCount={retryCount}
            onRetry={handleRetry}
          />
        </div>
      )}
      {children}
    </div>
  );
}

// Simple inline health dot for compact use
export function useDataHealth(isLoading: boolean, isError: boolean = false) {
  const [status, setStatus] = useState<HealthStatus>("loading");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (isLoading) {
      setStatus("loading");
    } else if (isError) {
      setStatus("failed");
    } else {
      setStatus("healthy");
      setLastUpdated(new Date());
    }
  }, [isLoading, isError]);

  return { status, lastUpdated };
}
