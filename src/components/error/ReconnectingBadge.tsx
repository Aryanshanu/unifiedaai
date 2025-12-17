import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReconnectingBadgeProps {
  isConnected: boolean;
  isReconnecting: boolean;
  className?: string;
}

export function ReconnectingBadge({ 
  isConnected, 
  isReconnecting, 
  className 
}: ReconnectingBadgeProps) {
  if (isConnected) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        "bg-green-500/10 text-green-600 dark:text-green-400",
        className
      )}>
        <Wifi className="h-3 w-3" />
        <span>Live</span>
      </div>
    );
  }

  if (isReconnecting) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        className
      )}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Reconnecting...</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
      "bg-red-500/10 text-red-600 dark:text-red-400",
      className
    )}>
      <WifiOff className="h-3 w-3" />
      <span>Offline</span>
    </div>
  );
}
