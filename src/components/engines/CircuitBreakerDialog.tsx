import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { CircuitBreakerState } from '@/hooks/useDQControlPlane';

interface CircuitBreakerDialogProps {
  state: CircuitBreakerState;
  onContinue: () => void;
  onStop: () => void;
}

export function CircuitBreakerDialog({ state, onContinue, onStop }: CircuitBreakerDialogProps) {
  const summary = state.executionSummary;
  
  return (
    <AlertDialog open={state.isTripped}>
      <AlertDialogContent className="max-w-lg border-destructive">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-destructive/10">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">
              Circuit Breaker Tripped
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">
                      Critical data quality failure detected
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      The pipeline has been paused to prevent potential data corruption. 
                      Review the failure details before deciding to continue.
                    </p>
                  </div>
                </div>
              </div>
              
              {summary && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-muted-foreground">Total Rules</p>
                    <p className="text-lg font-semibold">{summary.total_rules || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-muted-foreground">Passed</p>
                    <p className="text-lg font-semibold text-green-600">{summary.passed || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-muted-foreground">Failed</p>
                    <p className="text-lg font-semibold text-amber-600">{summary.failed || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-muted-foreground">Critical Failures</p>
                    <p className="text-lg font-semibold text-destructive">{summary.critical_failures || 0}</p>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Choose an action:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span><strong>Continue Anyway:</strong> Override the circuit breaker and complete remaining tasks (Dashboard Assets & Issue Management).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <span><strong>Stop Pipeline:</strong> Halt immediately to prevent downstream data corruption.</span>
                  </li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel 
            onClick={onStop}
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Stop Pipeline
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onContinue}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
