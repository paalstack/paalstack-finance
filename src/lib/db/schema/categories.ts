import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { profiles } from './profiles';

export const categoryTypeEnum = pgEnum('category_type', ['income', 'expense']);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    type: categoryTypeEnum('type').notNull(),
    color: text('color').notNull().default('#6366f1'),
    icon: text('icon').notNull().default('tag'),
    isSystem: boolean('is_system').notNull().default(false),
    parentId: uuid('parent_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('categories_user_id_idx').on(table.userId),
    index('categories_type_idx').on(table.type),
    index('categories_user_id_type_idx').on(table.userId, table.type),
    uniqueIndex('categories_system_slug_type_idx')
      .on(table.slug, table.type)
      .where(sql`${table.isSystem} = true`),
  ]
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategoryType = (typeof categoryTypeEnum.enumValues)[number];
