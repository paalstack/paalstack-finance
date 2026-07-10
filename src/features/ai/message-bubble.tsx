'use client';

import { Avatar, AvatarFallback, Box, TypographyMuted } from '@paalstack/react-ui';

import type { UIMessage } from 'ai';

type MessagePart = UIMessage['parts'][number];

const TOOL_LABELS: Record<string, string> = {
  getSpendingSummary: 'Checking your spending…',
  getTopCategories: 'Ranking your categories…',
  getBudgetStatus: 'Checking your budgets…',
  getEmiWarnings: 'Checking your loans…',
  getSavingsSnapshot: 'Reviewing your savings trend…',
};

const isToolPart = (
  part: MessagePart
): part is Extract<MessagePart, { type: `tool-${string}` } | { type: 'dynamic-tool' }> =>
  part.type === 'dynamic-tool' || part.type.startsWith('tool-');

const getToolLabel = (
  part: Extract<MessagePart, { type: `tool-${string}` } | { type: 'dynamic-tool' }>
) => {
  const name = part.type === 'dynamic-tool' ? part.toolName : part.type.slice('tool-'.length);
  return TOOL_LABELS[name] ?? 'Checking your data…';
};

type MessageBubbleProps = {
  message: UIMessage;
};

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === 'user';

  const text = message.parts
    .filter((part): part is Extract<MessagePart, { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('');

  const pendingTools = message.parts
    .filter(isToolPart)
    .filter((part) => part.state !== 'output-available' && part.state !== 'output-error');

  if (!text && pendingTools.length === 0) return null;

  return (
    <Box className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className="mt-0.5 h-7 w-7 shrink-0">
        <AvatarFallback
          className={isUser ? 'bg-primary/15 text-primary text-xs' : 'bg-muted text-xs'}
        >
          {isUser ? 'You' : 'AI'}
        </AvatarFallback>
      </Avatar>
      <Box
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        }`}
      >
        {pendingTools.map((part) => (
          <TypographyMuted
            key={part.toolCallId}
            className={`text-xs italic ${isUser ? 'text-primary-foreground/70' : ''}`}
          >
            {getToolLabel(part)}
          </TypographyMuted>
        ))}
        {text && <p className="whitespace-pre-wrap">{text}</p>}
      </Box>
    </Box>
  );
};
