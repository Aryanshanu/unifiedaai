import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SLACountdownProps {
  deadline: string;
  className?: string;
}

export function SLACountdown({ deadline, className }: SLACountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isOverdue: boolean } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const difference = deadlineTime - now;
      
      if (difference < 0) {
        const overdueDiff = Math.abs(difference);
        return {
          hours: Math.floor(overdueDiff / (1000 * 60 * 60)),
          minutes: Math.floor((overdueDiff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((overdueDiff % (1000 * 60)) / 1000),
          isOverdue: true
        };
      }
      
      return {
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        isOverdue: false
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  if (!timeLeft) return null;

  const isUrgent = !timeLeft.isOverdue && timeLeft.hours < 2;
  const isCritical = !timeLeft.isOverdue && timeLeft.hours < 1;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono",
      timeLeft.isOverdue 
        ? "bg-danger/10 text-danger border border-danger/30 animate-pulse" 
        : isCritical 
          ? "bg-danger/10 text-danger border border-danger/30" 
          : isUrgent 
            ? "bg-warning/10 text-warning border border-warning/30" 
            : "bg-muted text-muted-foreground",
      className
    )}>
      {timeLeft.isOverdue ? (
        <AlertTriangle className="w-4 h-4" />
      ) : (
        <Clock className="w-4 h-4" />
      )}
      <span>
        {timeLeft.isOverdue ? "OVERDUE " : ""}
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
