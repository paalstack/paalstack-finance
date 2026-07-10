'use client';

import { useChat } from '@ai-sdk/react';
import { Avatar, AvatarFallback, Box, Button, Textarea } from '@paalstack/react-ui';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';

import { track } from '@/lib/analytics';

import { MessageBubble } from './message-bubble';
import { SuggestedPrompts } from './suggested-prompts';

import type { UIMessage } from 'ai';

type ChatPanelProps = {
  conversationId: string;
  initialMessages: UIMessage[];
  onFirstMessage?: () => void;
};

export const ChatPanel = ({ conversationId, initialMessages, onFirstMessage }: ChatPanelProps) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, regenerate } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      body: { conversationId },
    }),
  });

  const isBusy = status === 'submitted' || status === 'streaming';
  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    const isFirstMessage = messages.length === 0;
    void sendMessage({ text: trimmed });
    setInput('');
    track('ai_message_sent', { conversationId });
    if (isFirstMessage) onFirstMessage?.();
  };

  return (
    <Box className="flex flex-1 flex-col overflow-hidden">
      <Box ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <SuggestedPrompts onSelect={submit} />
        ) : (
          <Box className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {status === 'submitted' && lastMessage?.role === 'user' && (
              <Box className="flex items-center gap-2.5">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-muted text-xs">AI</AvatarFallback>
                </Avatar>
                <Box className="bg-muted flex items-center gap-1 rounded-2xl px-4 py-3">
                  <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
                  <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
                  <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full" />
                </Box>
              </Box>
            )}
            {error && (
              <Box className="border-destructive bg-destructive/10 text-destructive flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                <span>{error.message || 'Something went wrong. Please try again.'}</span>
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => void regenerate()}
                >
                  Retry
                </button>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Box className="border-border border-t p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(input);
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submit(input);
              }
            }}
            placeholder="Ask about your spending, budgets, or EMIs…"
            rows={1}
            className="max-h-32 flex-1 resize-none"
            disabled={isBusy}
          />
          <Button type="submit" disabled={isBusy || !input.trim()}>
            Send
          </Button>
        </form>
      </Box>
    </Box>
  );
};
