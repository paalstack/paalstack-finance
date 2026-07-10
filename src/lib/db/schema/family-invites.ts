import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { families } from './families';
import { familyMemberRoleEnum } from './family-members';
import { profiles } from './profiles';

export const familyInviteStatusEnum = pgEnum('family_invite_status', [
  'pending',
  'accepted',
  'revoked',
  'expired',
]);

export const familyInvites = pgTable(
  'family_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: familyMemberRoleEnum('role').notNull().default('member'),
    token: text('token').notNull(),
    status: familyInviteStatusEnum('status').notNull().default('pending'),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('family_invites_family_id_idx').on(table.familyId),
    uniqueIndex('family_invites_token_idx').on(table.token),
    index('family_invites_email_idx').on(table.email),
    index('family_invites_family_id_status_idx').on(table.familyId, table.status),
  ]
);

export type FamilyInvite = typeof familyInvites.$inferSelect;
export type NewFamilyInvite = typeof familyInvites.$inferInsert;
export type FamilyInviteStatus = (typeof familyInviteStatusEnum.enumValues)[number];
