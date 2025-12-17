import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Error() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh]);

  const handleRetry = () => {
    navigate('/');
  };

  const handleReload = () => {
    window.location.reload();
  };

  const cancelAutoRefresh = () => {
    setAutoRefresh(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Pulsing Logo */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Shield className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full">
              <span className="text-xs font-semibold text-primary-foreground">RAI-OS</span>
            </div>
          </div>
        </div>

        {/* Main Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            We're fixing it right now
          </h1>
          <p className="text-lg text-muted-foreground">
            Our systems detected an issue and we're already working on it.
          </p>
        </div>

        {/* Status Cards */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Your work is safe</p>
              <p className="text-sm text-muted-foreground">All data has been preserved</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Error logged</p>
              <p className="text-sm text-muted-foreground">Our team has been notified</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Auto-recovery active</p>
              <p className="text-sm text-muted-foreground">
                {autoRefresh 
                  ? `Refreshing in ${countdown} seconds` 
                  : 'Auto-refresh cancelled'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleRetry} size="lg" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Go to Dashboard
          </Button>
          <Button onClick={handleReload} variant="outline" size="lg">
            Reload Now
          </Button>
        </div>

        {autoRefresh && (
          <button 
            onClick={cancelAutoRefresh}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel auto-refresh
          </button>
        )}

        {/* Footer */}
        <div className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">Fractal RAI-OS</span>
            {' '}• Global Responsible AI Operating System
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            December 2025 • Bulletproof Edition
          </p>
        </div>
      </div>
    </div>
  );
}
