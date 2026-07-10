import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { families } from './families';
import { profiles } from './profiles';

export const familyActivityActionEnum = pgEnum('family_activity_action', [
  'family_created',
  'family_updated',
  'member_invited',
  'member_joined',
  'member_removed',
  'member_left',
  'member_role_changed',
  'invite_revoked',
  'invite_resent',
]);

export const familyActivityLog = pgTable(
  'family_activity_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => profiles.id, { onDelete: 'set null' }),
    action: familyActivityActionEnum('action').notNull(),
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('family_activity_log_family_id_created_at_idx').on(table.familyId, table.createdAt),
    index('family_activity_log_family_id_idx').on(table.familyId),
  ]
);

export type FamilyActivityLog = typeof familyActivityLog.$inferSelect;
export type NewFamilyActivityLog = typeof familyActivityLog.$inferInsert;
export type FamilyActivityAction = (typeof familyActivityActionEnum.enumValues)[number];
