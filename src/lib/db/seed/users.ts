import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';

import { DEMO_IDS } from './demo-ids';

export const seedDemoUsers = async () => {
  const rows = [
    {
      id: DEMO_IDS.users.owner,
      email: 'owner@paalstack.dev',
      fullName: 'Arun Kumar',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    },
    {
      id: DEMO_IDS.users.spouse,
      email: 'spouse@paalstack.dev',
      fullName: 'Divya Kumar',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    },
  ];

  await db
    .insert(profiles)
    .values(rows)
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        email: sql`excluded.email`,
        fullName: sql`excluded.full_name`,
        updatedAt: sql`now()`,
      },
    });

  logger.info(`Seeded ${rows.length} demo users`);
};
