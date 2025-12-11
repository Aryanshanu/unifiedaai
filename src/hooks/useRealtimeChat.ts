import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamState {
  isStreaming: boolean;
  currentTokenIndex: number;
  blockedAtToken: number | null;
  blockReason: string | null;
}

interface UseRealtimeChatOptions {
  systemId: string;
  onTokenReceived?: (token: string, index: number) => void;
  onBlocked?: (reason: string, tokenIndex: number) => void;
  onError?: (error: string) => void;
}

export function useRealtimeChat(options: UseRealtimeChatOptions) {
  const { systemId, onTokenReceived, onBlocked, onError } = options;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamState, setStreamState] = useState<StreamState>({
    isStreaming: false,
    currentTokenIndex: 0,
    blockedAtToken: null,
    blockReason: null,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const currentAssistantMessage = useRef<string>('');
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const wsUrl = supabaseUrl?.replace('https://', 'wss://').replace('.supabase.co', '.functions.supabase.co');

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${wsUrl}/functions/v1/realtime-chat`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      // Initialize session
      ws.send(JSON.stringify({
        type: 'session.init',
        systemId
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'session.created':
            console.log('Session created for system:', data.systemName);
            break;
            
          case 'response.started':
            setStreamState(prev => ({
              ...prev,
              isStreaming: true,
              currentTokenIndex: 0,
              blockedAtToken: null,
              blockReason: null,
            }));
            currentAssistantMessage.current = '';
            // Add empty assistant message to be filled
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
            break;
            
          case 'response.delta':
            currentAssistantMessage.current += data.token;
            setStreamState(prev => ({
              ...prev,
              currentTokenIndex: data.tokenIndex,
            }));
            onTokenReceived?.(data.token, data.tokenIndex);
            // Update the last assistant message
            setMessages(prev => {
              const updated = [...prev];
              if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                updated[updated.length - 1].content = currentAssistantMessage.current;
              }
              return updated;
            });
            break;
            
          case 'response.done':
            setStreamState(prev => ({
              ...prev,
              isStreaming: false,
            }));
            break;
            
          case 'response.blocked':
            setStreamState(prev => ({
              ...prev,
              isStreaming: false,
              blockedAtToken: data.blockedAtToken || 0,
              blockReason: data.reason,
            }));
            onBlocked?.(data.reason, data.blockedAtToken || 0);
            toast.error(`Response blocked at token ${data.blockedAtToken || 'input'}`, {
              description: data.reason,
              duration: 5000,
            });
            // Update assistant message to show block
            setMessages(prev => {
              const updated = [...prev];
              if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                updated[updated.length - 1].content = 
                  `[BLOCKED at token ${data.blockedAtToken}] ${currentAssistantMessage.current}\n\n⚠️ ${data.reason}`;
              }
              return updated;
            });
            break;
            
          case 'error':
            setStreamState(prev => ({ ...prev, isStreaming: false }));
            onError?.(data.message);
            toast.error('Stream error', { description: data.message });
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.('WebSocket connection error');
    };
    
    ws.onclose = () => {
      console.log('WebSocket closed');
      setStreamState(prev => ({ ...prev, isStreaming: false }));
    };
    
    wsRef.current = ws;
  }, [wsUrl, systemId, onTokenReceived, onBlocked, onError]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connect();
      // Wait for connection then send
      setTimeout(() => sendMessage(content), 500);
      return;
    }
    
    // Add user message immediately
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    
    // Send to WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'message.send',
      messages: [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }))
    }));
  }, [messages, connect]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    currentAssistantMessage.current = '';
    setStreamState({
      isStreaming: false,
      currentTokenIndex: 0,
      blockedAtToken: null,
      blockReason: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    messages,
    streamState,
    connect,
    disconnect,
    sendMessage,
    clearMessages,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
