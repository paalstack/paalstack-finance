import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { profiles } from './profiles';

export const families = pgTable(
  'families',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    currency: text('currency').notNull().default('INR'),
    inviteCode: text('invite_code').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('families_owner_id_idx').on(table.ownerId),
    uniqueIndex('families_invite_code_idx').on(table.inviteCode),
  ]
);

export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;
