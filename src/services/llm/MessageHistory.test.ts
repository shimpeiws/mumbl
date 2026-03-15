import { beforeEach, describe, expect, it } from 'vitest';
import {
  type MessageHistoryInterface,
  type SessionMessageHistoryInterface,
  createMessageHistory,
  createSessionMessageHistory,
} from './MessageHistory.js';
import type { Message } from './types.js';

describe('MessageHistory', () => {
  let history: MessageHistoryInterface;

  beforeEach(() => {
    history = createMessageHistory(5);
  });

  describe('add', () => {
    it('should add a message to the history', () => {
      const message: Message = { role: 'user', content: 'Hello' };
      history.add(message);

      expect(history.length).toBe(1);
      expect(history.getMessages()).toEqual([message]);
    });

    it('should trim messages when exceeding max', () => {
      for (let i = 0; i < 7; i++) {
        history.add({ role: 'user', content: `Message ${i}` });
      }

      expect(history.length).toBe(5);
      expect(history.getMessages()[0].content).toBe('Message 2');
      expect(history.getMessages()[4].content).toBe('Message 6');
    });
  });

  describe('addMany', () => {
    it('should add multiple messages at once', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];
      history.addMany(messages);

      expect(history.length).toBe(2);
      expect(history.getMessages()).toEqual(messages);
    });
  });

  describe('getRecentMessages', () => {
    it('should return the last N messages', () => {
      for (let i = 0; i < 5; i++) {
        history.add({ role: 'user', content: `Message ${i}` });
      }

      const recent = history.getRecentMessages(3);
      expect(recent.length).toBe(3);
      expect(recent[0].content).toBe('Message 2');
      expect(recent[2].content).toBe('Message 4');
    });

    it('should return all messages if count exceeds length', () => {
      history.add({ role: 'user', content: 'Message 1' });
      history.add({ role: 'user', content: 'Message 2' });

      const recent = history.getRecentMessages(10);
      expect(recent.length).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all messages', () => {
      history.add({ role: 'user', content: 'Hello' });
      history.add({ role: 'assistant', content: 'Hi' });

      history.clear();

      expect(history.length).toBe(0);
      expect(history.getMessages()).toEqual([]);
    });
  });

  describe('getMessages', () => {
    it('should return a copy of messages', () => {
      const message: Message = { role: 'user', content: 'Hello' };
      history.add(message);

      const messages = history.getMessages();
      messages.push({ role: 'assistant', content: 'Modified' });

      expect(history.length).toBe(1);
    });
  });
});

describe('SessionMessageHistory', () => {
  let sessionHistory: SessionMessageHistoryInterface;

  beforeEach(() => {
    sessionHistory = createSessionMessageHistory(10);
  });

  describe('getSession', () => {
    it('should create a new session if it does not exist', () => {
      const session = sessionHistory.getSession('session1');
      // Check for interface shape instead of class instance
      expect(session).toHaveProperty('add');
      expect(session).toHaveProperty('getMessages');
      expect(session).toHaveProperty('clear');
      expect(session.length).toBe(0);
    });

    it('should return the same session for the same ID', () => {
      const session1 = sessionHistory.getSession('session1');
      session1.add({ role: 'user', content: 'Hello' });

      const session1Again = sessionHistory.getSession('session1');
      expect(session1Again.length).toBe(1);
    });

    it('should return different sessions for different IDs', () => {
      const session1 = sessionHistory.getSession('session1');
      session1.add({ role: 'user', content: 'Hello from session 1' });

      const session2 = sessionHistory.getSession('session2');
      expect(session2.length).toBe(0);
    });
  });

  describe('clearSession', () => {
    it('should remove a specific session', () => {
      const session = sessionHistory.getSession('session1');
      session.add({ role: 'user', content: 'Hello' });

      sessionHistory.clearSession('session1');

      expect(sessionHistory.hasSession('session1')).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should remove all sessions', () => {
      sessionHistory.getSession('session1').add({ role: 'user', content: 'Hello' });
      sessionHistory.getSession('session2').add({ role: 'user', content: 'Hi' });

      sessionHistory.clearAll();

      expect(sessionHistory.getSessionIds()).toEqual([]);
    });
  });

  describe('getSessionIds', () => {
    it('should return all active session IDs', () => {
      sessionHistory.getSession('session1');
      sessionHistory.getSession('session2');
      sessionHistory.getSession('session3');

      const ids = sessionHistory.getSessionIds();
      expect(ids).toContain('session1');
      expect(ids).toContain('session2');
      expect(ids).toContain('session3');
    });
  });

  describe('hasSession', () => {
    it('should return true for existing sessions', () => {
      sessionHistory.getSession('session1');
      expect(sessionHistory.hasSession('session1')).toBe(true);
    });

    it('should return false for non-existing sessions', () => {
      expect(sessionHistory.hasSession('nonexistent')).toBe(false);
    });
  });
});
