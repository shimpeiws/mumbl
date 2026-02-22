/**
 * Message history management for conversation context
 */
import type { Message } from './types.js';

/**
 * Message history interface
 */
export interface MessageHistoryInterface {
  add(message: Message): void;
  addMany(messages: Message[]): void;
  getMessages(): Message[];
  getRecentMessages(count: number): Message[];
  clear(): void;
  readonly length: number;
}

/**
 * Session message history interface
 */
export interface SessionMessageHistoryInterface {
  getSession(sessionId: string): MessageHistoryInterface;
  clearSession(sessionId: string): void;
  clearAll(): void;
  getSessionIds(): string[];
  hasSession(sessionId: string): boolean;
}

/**
 * Create an in-memory message history store
 */
export function createMessageHistory(maxMessages = 20): MessageHistoryInterface {
  let messages: Message[] = [];

  const trim = (): void => {
    if (messages.length > maxMessages) {
      messages = messages.slice(-maxMessages);
    }
  };

  const add = (message: Message): void => {
    messages.push(message);
    trim();
  };

  const addMany = (newMessages: Message[]): void => {
    messages.push(...newMessages);
    trim();
  };

  const getMessages = (): Message[] => {
    return [...messages];
  };

  const getRecentMessages = (count: number): Message[] => {
    return messages.slice(-count);
  };

  const clear = (): void => {
    messages = [];
  };

  return {
    add,
    addMany,
    getMessages,
    getRecentMessages,
    clear,
    get length() {
      return messages.length;
    },
  };
}

/**
 * Create a session-based message history manager
 * Allows managing multiple conversation histories by session ID
 */
export function createSessionMessageHistory(maxMessages = 20): SessionMessageHistoryInterface {
  const sessions: Map<string, MessageHistoryInterface> = new Map();

  const getSession = (sessionId: string): MessageHistoryInterface => {
    let history = sessions.get(sessionId);
    if (!history) {
      history = createMessageHistory(maxMessages);
      sessions.set(sessionId, history);
    }
    return history;
  };

  const clearSession = (sessionId: string): void => {
    sessions.delete(sessionId);
  };

  const clearAll = (): void => {
    sessions.clear();
  };

  const getSessionIds = (): string[] => {
    return Array.from(sessions.keys());
  };

  const hasSession = (sessionId: string): boolean => {
    return sessions.has(sessionId);
  };

  return {
    getSession,
    clearSession,
    clearAll,
    getSessionIds,
    hasSession,
  };
}
