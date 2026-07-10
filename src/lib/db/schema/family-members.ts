import { index, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { families } from './families';
import { profiles } from './profiles';

export const familyMemberRoleEnum = pgEnum('family_member_role', [
  'owner',
  'admin',
  'member',
  'viewer',
]);

export const familyMemberStatusEnum = pgEnum('family_member_status', [
  'invited',
  'active',
  'removed',
]);

export const familyMembers = pgTable(
  'family_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    role: familyMemberRoleEnum('role').notNull().default('member'),
    status: familyMemberStatusEnum('status').notNull().default('active'),
    invitedBy: uuid('invited_by').references(() => profiles.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('family_members_family_id_idx').on(table.familyId),
    index('family_members_user_id_idx').on(table.userId),
    index('family_members_family_id_status_idx').on(table.familyId, table.status),
    uniqueIndex('family_members_family_id_user_id_idx').on(table.familyId, table.userId),
  ]
);

export type FamilyMember = typeof familyMembers.$inferSelect;
export type NewFamilyMember = typeof familyMembers.$inferInsert;
export type FamilyMemberRole = (typeof familyMemberRoleEnum.enumValues)[number];
export type FamilyMemberStatus = (typeof familyMemberStatusEnum.enumValues)[number];
