import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

interface SecurityPostureGaugeProps {
  score: number;
  showDetails?: boolean;
}

export function SecurityPostureGauge({ score, showDetails = true }: SecurityPostureGaugeProps) {
  const { color, label, Icon, bgColor } = useMemo(() => {
    if (score >= 80) {
      return { color: 'text-green-500', label: 'Excellent', Icon: ShieldCheck, bgColor: 'bg-green-500/10' };
    } else if (score >= 60) {
      return { color: 'text-blue-500', label: 'Good', Icon: Shield, bgColor: 'bg-blue-500/10' };
    } else if (score >= 40) {
      return { color: 'text-yellow-500', label: 'Fair', Icon: ShieldAlert, bgColor: 'bg-yellow-500/10' };
    } else {
      return { color: 'text-red-500', label: 'Poor', Icon: ShieldX, bgColor: 'bg-red-500/10' };
    }
  }, [score]);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card className={showDetails ? '' : 'border-0 shadow-none'}>
      {showDetails && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            Security Posture
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showDetails ? '' : 'p-0'}>
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={color}
                style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${color}`}>{Math.round(score)}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
        </div>
        {showDetails && (
          <div className="mt-4 text-center">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bgColor} ${color}`}>
              <Icon className="h-3 w-3" />
              {label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
