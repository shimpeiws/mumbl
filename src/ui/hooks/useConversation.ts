import { useCallback, useRef, useState } from 'react';
import type { ConversationServiceInterface } from '../../services/conversation/conversation-service.js';
import type { EntryServiceInterface } from '../../services/entry-service.js';
import type { LLMServiceInterface } from '../../services/llm/llm-service.js';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface UseConversationOptions {
  conversationService?: ConversationServiceInterface;
  llmService: LLMServiceInterface;
  entryService: EntryServiceInterface;
  conversationId: string | null;
}

interface UseConversationReturn {
  messages: ConversationMessage[];
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useConversation({
  conversationService,
  llmService,
  entryService,
  conversationId,
}: UseConversationOptions): UseConversationReturn {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(0);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationService || !conversationId) {
        setError('Conversation service not available');
        return;
      }

      setIsLoading(true);
      setError(null);

      const userMsgId = `msg-${nextId.current}`;
      nextId.current += 1;
      setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content }]);

      try {
        const entry = entryService.create({ content });
        conversationService.addEntry(conversationId, entry.id, content);

        const context = conversationService.getContext(conversationId);
        if (!context) {
          setError('Failed to load conversation context');
          setIsLoading(false);
          return;
        }

        const response = await llmService.chatWithContext(content, context);

        const assistantMsgId = `msg-${nextId.current}`;
        nextId.current += 1;
        setMessages((prev) => [
          ...prev,
          { id: assistantMsgId, role: 'assistant', content: response.content },
        ]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationService, llmService, entryService, conversationId],
  );

  return { messages, sendMessage, isLoading, error };
}
