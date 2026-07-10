import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { families } from './families';
import { profiles } from './profiles';

export type AiConversationMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
};

export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').references(() => families.id, { onDelete: 'set null' }),
    title: text('title'),
    model: text('model'),
    messages: jsonb('messages').notNull().default([]).$type<AiConversationMessage[]>(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    isArchived: boolean('is_archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ai_conversations_user_id_idx').on(table.userId),
    index('ai_conversations_family_id_idx').on(table.familyId),
    index('ai_conversations_user_id_last_message_at_idx').on(table.userId, table.lastMessageAt),
  ]
);

export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;
