import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { XCircle, Settings, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SystemErrorDisplayProps {
  error: string;
  systemName?: string;
  onRetry?: () => void;
}

export function SystemErrorDisplay({ error, systemName, onRetry }: SystemErrorDisplayProps) {
  // Parse the error to provide helpful hints
  const getErrorHints = (errorMsg: string): { hint: string; action?: React.ReactNode } => {
    const errorLower = errorMsg.toLowerCase();
    
    if (errorLower.includes('api key') || errorLower.includes('api_token') || errorLower.includes('unauthorized') || errorLower.includes('401')) {
      return {
        hint: 'The API key may be missing or invalid. Please check your system configuration.',
        action: (
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link to="/models">
              <Settings className="h-4 w-4 mr-2" />
              Configure API Key
            </Link>
          </Button>
        ),
      };
    }
    
    if (errorLower.includes('endpoint') || errorLower.includes('url') || errorLower.includes('404') || errorLower.includes('not found')) {
      return {
        hint: 'The endpoint URL may be incorrect. For OpenRouter, use: https://openrouter.ai/api/v1/chat/completions',
        action: (
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link to="/models">
              <Settings className="h-4 w-4 mr-2" />
              Fix Endpoint URL
            </Link>
          </Button>
        ),
      };
    }
    
    if (errorLower.includes('rate limit') || errorLower.includes('429') || errorLower.includes('too many')) {
      return {
        hint: 'You are being rate limited by the provider. Please wait a moment and try again.',
        action: onRetry ? (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        ) : undefined,
      };
    }
    
    if (errorLower.includes('openrouter')) {
      return {
        hint: 'OpenRouter requires specific headers. Make sure your system is configured with provider "openrouter" or the endpoint contains "openrouter.ai".',
        action: (
          <Button asChild variant="outline" size="sm" className="mt-2">
            <a href="https://openrouter.ai/docs" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              OpenRouter Docs
            </a>
          </Button>
        ),
      };
    }
    
    if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
      return {
        hint: 'The request timed out. The target system may be slow or unresponsive.',
        action: onRetry ? (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        ) : undefined,
      };
    }
    
    if (errorLower.includes('system not found')) {
      return {
        hint: 'The selected system no longer exists. Please select a different system.',
        action: (
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link to="/models">
              <Settings className="h-4 w-4 mr-2" />
              View Systems
            </Link>
          </Button>
        ),
      };
    }
    
    // Default
    return {
      hint: 'An unexpected error occurred. Check the system configuration or try again.',
      action: (
        <div className="flex gap-2 mt-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to="/models">
              <Settings className="h-4 w-4 mr-2" />
              Check Configuration
            </Link>
          </Button>
        </div>
      ),
    };
  };

  const { hint, action } = getErrorHints(error);

  return (
    <Alert className="border-destructive/50 bg-destructive/10">
      <XCircle className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-800 dark:text-red-400">
        Target System Error{systemName && `: ${systemName}`}
      </AlertTitle>
      <AlertDescription className="text-red-700 dark:text-red-300 space-y-2">
        <p className="font-mono text-sm">{error}</p>
        <p className="text-sm">{hint}</p>
        {action}
      </AlertDescription>
    </Alert>
  );
}
