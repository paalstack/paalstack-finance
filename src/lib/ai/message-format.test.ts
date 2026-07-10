import { describe, expect, it } from 'vitest';

import { deriveConversationTitle, fromUIMessage, toUIMessage } from './message-format';

import type { UIMessage } from 'ai';

describe('deriveConversationTitle', () => {
  it('collapses whitespace and uses the message as-is when short', () => {
    expect(deriveConversationTitle('  How much  did I\nspend?  ')).toBe('How much did I spend?');
  });

  it('falls back to a default title for empty input', () => {
    expect(deriveConversationTitle('   ')).toBe('New conversation');
  });

  it('truncates long messages with an ellipsis', () => {
    const long = 'a'.repeat(100);
    const title = deriveConversationTitle(long);
    expect(title).toHaveLength(60);
    expect(title.endsWith('\u2026')).toBe(true);
  });
});

describe('toUIMessage', () => {
  it('wraps stored content into a single text part with metadata', () => {
    const result = toUIMessage(
      { role: 'assistant', content: 'You spent ₹500', createdAt: '2026-01-01T00:00:00.000Z' },
      'msg-1'
    );
    expect(result).toEqual({
      id: 'msg-1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'You spent ₹500' }],
      metadata: { createdAt: '2026-01-01T00:00:00.000Z' },
    });
  });
});

describe('fromUIMessage', () => {
  it('joins text parts and carries the createdAt metadata through', () => {
    const message: UIMessage = {
      id: 'msg-1',
      role: 'user',
      parts: [
        { type: 'text', text: 'How much ' },
        { type: 'text', text: 'did I spend?' },
      ],
      metadata: { createdAt: '2026-01-01T00:00:00.000Z' },
    };
    expect(fromUIMessage(message)).toEqual({
      role: 'user',
      content: 'How much did I spend?',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('returns null for a message with no text content (e.g. tool-call only)', () => {
    const message: UIMessage = { id: 'msg-2', role: 'assistant', parts: [] };
    expect(fromUIMessage(message)).toBeNull();
  });
});
