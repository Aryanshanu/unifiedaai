import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface FreshnessIndicatorProps {
  lastDataUpdate: string | null;
  stalenessStatus: 'fresh' | 'warning' | 'stale' | string | null;
  freshnessThresholdDays?: number;
  onThresholdChange?: (days: number) => void;
  showConfig?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  fresh: {
    icon: CheckCircle,
    label: 'Fresh',
    className: 'bg-success/10 text-success border-success/30',
    description: 'Data is within freshness threshold',
  },
  warning: {
    icon: Clock,
    label: 'Warning',
    className: 'bg-warning/10 text-warning border-warning/30',
    description: 'Data approaching staleness threshold',
  },
  stale: {
    icon: AlertTriangle,
    label: 'Stale',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
    description: 'Data exceeds freshness threshold',
  },
};

export function FreshnessIndicator({
  lastDataUpdate,
  stalenessStatus,
  freshnessThresholdDays = 7,
  onThresholdChange,
  showConfig = false,
  size = 'md',
}: FreshnessIndicatorProps) {
  const [threshold, setThreshold] = useState(freshnessThresholdDays);
  
  const status = stalenessStatus || 'fresh';
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.fresh;
  const StatusIcon = config.icon;

  const sizeClasses = {
    sm: 'text-xs py-0.5 px-1.5',
    md: 'text-sm py-1 px-2',
    lg: 'text-base py-1.5 px-3',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  const handleThresholdSave = () => {
    onThresholdChange?.(threshold);
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(config.className, sizeClasses[size], 'cursor-help')}
            >
              <StatusIcon className={cn(iconSizes[size], 'mr-1')} />
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{config.description}</p>
              {lastDataUpdate ? (
                <p className="text-xs text-muted-foreground">
                  Last updated: {formatDistanceToNow(new Date(lastDataUpdate), { addSuffix: true })}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No update timestamp recorded
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Threshold: {freshnessThresholdDays} days
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {lastDataUpdate && (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(lastDataUpdate), { addSuffix: true })}
        </span>
      )}

      {showConfig && onThresholdChange && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="threshold" className="text-sm font-medium">
                  Freshness Threshold (days)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Data older than this will be marked as stale
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  id="threshold"
                  type="number"
                  min={1}
                  max={365}
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value) || 7)}
                  className="h-8"
                />
                <Button size="sm" onClick={handleThresholdSave}>
                  Save
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// Compact version for table cells
export function FreshnessStatusBadge({
  status,
  size = 'sm',
}: {
  status: 'fresh' | 'warning' | 'stale' | string | null;
  size?: 'sm' | 'md';
}) {
  const config = statusConfig[(status || 'fresh') as keyof typeof statusConfig] || statusConfig.fresh;
  const StatusIcon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.className,
        size === 'sm' ? 'text-xs py-0.5 px-1.5' : 'text-sm py-1 px-2'
      )}
    >
      <StatusIcon className={size === 'sm' ? 'h-3 w-3 mr-1' : 'h-3.5 w-3.5 mr-1'} />
      {config.label}
    </Badge>
  );
}
