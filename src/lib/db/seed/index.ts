import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';

import { defaultCategories } from './categories';
import { seedDemoFamily } from './families';
import { seedDemoFinanceData } from './finance-demo';
import { seedDemoUsers } from './users';

const seedDefaultCategories = async () => {
  const rows = defaultCategories.map((category) => ({
    ...category,
    userId: null,
    isSystem: true,
  }));

  await db
    .insert(categories)
    .values(rows)
    .onConflictDoUpdate({
      target: [categories.slug, categories.type],
      targetWhere: sql`${categories.isSystem} = true`,
      set: {
        name: sql`excluded.name`,
        icon: sql`excluded.icon`,
        color: sql`excluded.color`,
        sortOrder: sql`excluded.sort_order`,
        updatedAt: sql`now()`,
      },
    });

  logger.info(`Seeded ${rows.length} default categories`);
};

const main = async () => {
  await seedDefaultCategories();

  // Demo data below is for local development only — gate it so it never
  // accidentally runs against a staging/production database.
  if (process.env.NODE_ENV === 'production') {
    process.exit(0);
  }

  await seedDemoUsers();
  await seedDemoFamily();
  await seedDemoFinanceData();

  process.exit(0);
};

main().catch((error) => {
  logger.error('Seed failed', { error });
  process.exit(1);
});
