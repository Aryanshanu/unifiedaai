import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import { logError } from '@/lib/error-logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to Supabase
    logError({
      error_type: 'react_boundary',
      error_message: error.message,
      error_stack: error.stack,
      component_name: errorInfo.componentStack?.split('\n')[1]?.trim() || 'Unknown',
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Pulsing Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                  <Shield className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>

            {/* Friendly Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Temporary issue
              </h1>
              <p className="text-muted-foreground">
                Auto-recovery in progress. Your data is safe.
              </p>
            </div>

            {/* Status Card */}
            <div className="bg-card border border-border rounded-lg p-4 text-left space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-muted-foreground">Your data is protected</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-muted-foreground">Auto-recovery in progress</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-muted-foreground">Error logged for review</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="default" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={this.handleReload} variant="outline" className="gap-2">
                Reload Page
              </Button>
            </div>

            {/* Fractal Branding */}
            <p className="text-xs text-muted-foreground pt-4">
              Fractal Unified-OS • Autonomous Governance Platform
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inline Error Boundary for specific components
export function ComponentErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: ReactNode; 
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
