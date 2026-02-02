/**
 * Message history management for conversation context
 */
import type { Message } from './types.js';

/**
 * In-memory message history store
 */
export class MessageHistory {
  private messages: Message[] = [];
  private maxMessages: number;

  constructor(maxMessages = 20) {
    this.maxMessages = maxMessages;
  }

  /**
   * Add a message to the history
   */
  add(message: Message): void {
    this.messages.push(message);
    this.trim();
  }

  /**
   * Add multiple messages to the history
   */
  addMany(messages: Message[]): void {
    this.messages.push(...messages);
    this.trim();
  }

  /**
   * Get all messages in the history
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Get the last N messages
   */
  getRecentMessages(count: number): Message[] {
    return this.messages.slice(-count);
  }

  /**
   * Clear the message history
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Get the number of messages in the history
   */
  get length(): number {
    return this.messages.length;
  }

  /**
   * Trim the history to the maximum number of messages
   * Keeps the most recent messages
   */
  private trim(): void {
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
  }
}

/**
 * Session-based message history manager
 * Allows managing multiple conversation histories by session ID
 */
export class SessionMessageHistory {
  private sessions: Map<string, MessageHistory> = new Map();
  private maxMessages: number;

  constructor(maxMessages = 20) {
    this.maxMessages = maxMessages;
  }

  /**
   * Get or create a message history for a session
   */
  getSession(sessionId: string): MessageHistory {
    let history = this.sessions.get(sessionId);
    if (!history) {
      history = new MessageHistory(this.maxMessages);
      this.sessions.set(sessionId, history);
    }
    return history;
  }

  /**
   * Clear a specific session's history
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Clear all sessions
   */
  clearAll(): void {
    this.sessions.clear();
  }

  /**
   * Get all active session IDs
   */
  getSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Check if a session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}
