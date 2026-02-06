import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Plug, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { safeInvoke } from '@/lib/safe-supabase';
import { toast } from 'sonner';

interface ConnectionTestButtonProps {
  systemId: string;
  systemName?: string;
  className?: string;
  onSuccess?: () => void;
}

interface TestResult {
  success: boolean;
  response?: string;
  error?: string;
  metadata?: {
    provider: string;
    model: string;
    latency_ms: number;
  };
}

export function ConnectionTestButton({ systemId, systemName, className, onSuccess }: ConnectionTestButtonProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await safeInvoke<TestResult>('target-executor', {
        systemId,
        messages: [
          { role: 'user', content: 'Say exactly: "Connection successful" and nothing else.' }
        ],
        maxTokens: 50,
        temperature: 0,
      });

      if (error) {
        setTestResult({ success: false, error: error.message || 'Connection test failed' });
        toast.error('Connection test failed', { description: error.message });
        return;
      }

      setTestResult({
        success: data?.success || false,
        response: data?.response,
        error: data?.error,
        metadata: data?.metadata,
      });

      if (data?.success) {
        toast.success('Connection successful!', {
          description: `${data.metadata?.provider || 'Target'} responded in ${data.metadata?.latency_ms || 0}ms`,
        });
        onSuccess?.();
      } else {
        toast.error('Connection failed', { description: data?.error });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setTestResult({ success: false, error: errorMsg });
      toast.error('Connection test failed', { description: errorMsg });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className={className}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleTestConnection}
        disabled={isTesting}
      >
        {isTesting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Plug className="h-4 w-4 mr-2" />
        )}
        {isTesting ? 'Testing...' : 'Test Connection'}
      </Button>

      {testResult && (
        <Alert className={`mt-3 ${testResult.success ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : 'border-destructive/50 bg-destructive/10'}`}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertTitle className={testResult.success ? 'text-green-800' : 'text-red-800'}>
            {testResult.success ? 'Connection Successful' : 'Connection Failed'}
          </AlertTitle>
          <AlertDescription className={testResult.success ? 'text-green-700' : 'text-red-700'}>
            {testResult.success ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{testResult.metadata?.provider || 'Unknown'}</Badge>
                  <Badge variant="secondary">{testResult.metadata?.latency_ms || 0}ms</Badge>
                </div>
                {testResult.response && (
                  <p className="text-xs font-mono truncate">{testResult.response.substring(0, 100)}</p>
                )}
              </div>
            ) : (
              <div>
                <p>{testResult.error}</p>
                <p className="text-xs mt-1">Check your endpoint URL and API token configuration.</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
