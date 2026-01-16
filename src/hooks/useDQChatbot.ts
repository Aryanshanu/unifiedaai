import { useState, useCallback } from 'react';
import { DQProfile, DQRule, DQExecution, DQIncident } from './useDQControlPlane';

interface DQContext {
  profile?: DQProfile | null;
  rules?: DQRule[];
  execution?: DQExecution | null;
  incidents?: DQIncident[];
  datasetName?: string;
}

interface UseDQChatbotReturn {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  context: DQContext;
  updateContext: (newContext: Partial<DQContext>) => void;
}

export function useDQChatbot(): UseDQChatbotReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<DQContext>({});

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen(prev => !prev), []);

  const updateContext = useCallback((newContext: Partial<DQContext>) => {
    setContext(prev => ({ ...prev, ...newContext }));
  }, []);

  return {
    isOpen,
    openChat,
    closeChat,
    toggleChat,
    context,
    updateContext
  };
}
