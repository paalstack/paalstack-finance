'use client';

import { Button, TypographyMuted, TypographySmall } from '@paalstack/react-ui';

const STARTER_PROMPTS = [
  'How much did I spend this month?',
  'Can I save more?',
  'Which category is highest?',
  'Do I have any EMIs due soon?',
];

type SuggestedPromptsProps = {
  onSelect: (prompt: string) => void;
};

export const SuggestedPrompts = ({ onSelect }: SuggestedPromptsProps) => (
  <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
    <div className="space-y-1">
      <TypographySmall className="text-base font-semibold">
        Ask your finance assistant anything
      </TypographySmall>
      <TypographyMuted className="text-sm">
        It reads your real transactions, budgets, and loans — no guessing.
      </TypographyMuted>
    </div>
    <div className="flex max-w-md flex-wrap justify-center gap-2">
      {STARTER_PROMPTS.map((prompt) => (
        <Button
          key={prompt}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelect(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  </div>
);
