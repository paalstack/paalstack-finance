import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { familyMembers, families } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';

import { DEMO_IDS } from './demo-ids';

export const seedDemoFamily = async () => {
  await db
    .insert(families)
    .values({
      id: DEMO_IDS.family,
      ownerId: DEMO_IDS.users.owner,
      name: 'The Kumar Family',
      description: 'Shared household budget for demo purposes',
      currency: 'INR',
      inviteCode: 'DEMO-KUMAR-1',
    })
    .onConflictDoUpdate({
      target: families.id,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        updatedAt: sql`now()`,
      },
    });

  const memberRows = [
    {
      id: DEMO_IDS.familyMembers.owner,
      familyId: DEMO_IDS.family,
      userId: DEMO_IDS.users.owner,
      role: 'owner' as const,
      status: 'active' as const,
      joinedAt: new Date(),
    },
    {
      id: DEMO_IDS.familyMembers.spouse,
      familyId: DEMO_IDS.family,
      userId: DEMO_IDS.users.spouse,
      role: 'member' as const,
      status: 'active' as const,
      invitedBy: DEMO_IDS.users.owner,
      joinedAt: new Date(),
    },
  ];

  await db
    .insert(familyMembers)
    .values(memberRows)
    .onConflictDoUpdate({
      target: familyMembers.id,
      set: {
        role: sql`excluded.role`,
        status: sql`excluded.status`,
        updatedAt: sql`now()`,
      },
    });

  logger.info('Seeded demo family with 2 members');
};
