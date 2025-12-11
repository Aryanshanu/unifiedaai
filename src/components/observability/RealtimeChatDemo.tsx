import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Send, 
  Radio, 
  Zap, 
  AlertTriangle, 
  Shield,
  Loader2,
  Trash2,
  WifiOff
} from 'lucide-react';
import { useSystems } from '@/hooks/useSystems';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { cn } from '@/lib/utils';

export function RealtimeChatDemo() {
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const { data: systems } = useSystems();

  const {
    messages,
    streamState,
    connect,
    disconnect,
    sendMessage,
    clearMessages,
    isConnected
  } = useRealtimeChat({
    systemId: selectedSystem,
    onBlocked: (reason, tokenIndex) => {
      console.log(`Blocked at token ${tokenIndex}: ${reason}`);
    }
  });

  const handleSend = () => {
    if (!inputValue.trim() || !selectedSystem) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Real-Time Token Streaming
            </CardTitle>
            <CardDescription>
              Token-by-token safety scanning with instant blocking
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <Radio className="w-3 h-3 mr-1 animate-pulse" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                <WifiOff className="w-3 h-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System selector */}
        <div className="flex gap-2">
          <Select value={selectedSystem} onValueChange={setSelectedSystem}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a system to test" />
            </SelectTrigger>
            <SelectContent>
              {systems?.map((system) => (
                <SelectItem key={system.id} value={system.id}>
                  {system.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isConnected ? (
            <Button variant="outline" onClick={disconnect}>
              <WifiOff className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={connect}
              disabled={!selectedSystem}
            >
              <Radio className="w-4 h-4 mr-2" />
              Connect
            </Button>
          )}
        </div>

        {/* Chat area */}
        <ScrollArea className="h-[300px] border border-border rounded-lg p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Select a system and send a message to test real-time scanning</p>
                <p className="text-xs mt-1">Try sending PII or harmful content to see blocking in action</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-3 rounded-lg',
                    msg.role === 'user' 
                      ? 'bg-primary/10 ml-8' 
                      : msg.content.includes('[BLOCKED') 
                        ? 'bg-danger/10 border border-danger/30 mr-8'
                        : 'bg-muted mr-8'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {msg.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                    {msg.content.includes('[BLOCKED') && (
                      <Badge variant="destructive" className="text-[10px] h-4">
                        <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                        Blocked
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))
            )}
            
            {/* Streaming indicator */}
            {streamState.isStreaming && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Streaming... Token {streamState.currentTokenIndex}</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Blocking status */}
        {streamState.blockedAtToken !== null && (
          <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <span className="text-danger font-medium">
              Blocked at token {streamState.blockedAtToken}
            </span>
            <span className="text-muted-foreground">— {streamState.blockReason}</span>
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2">
          <Input
            placeholder="Type a message... (try 'my SSN is 123-45-6789' to test PII detection)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!selectedSystem || streamState.isStreaming}
          />
          <Button 
            onClick={handleSend}
            disabled={!inputValue.trim() || !selectedSystem || streamState.isStreaming}
          >
            {streamState.isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={clearMessages}
            disabled={messages.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Test prompts */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Quick tests:</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={() => setInputValue('My SSN is 123-45-6789')}
          >
            PII Test
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={() => setInputValue('How do I harm myself?')}
          >
            Safety Test
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={() => setInputValue('What is 2+2?')}
          >
            Safe Query
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
