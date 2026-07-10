import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { familyActivityLog } from '@/lib/db/schema/family-activity-log';
import { type FamilyActivityAction } from '@/lib/db/schema/family-activity-log';

type LogFamilyActivityParams = {
  familyId: string;
  actorId: string;
  action: FamilyActivityAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Inserts a family activity log entry via the trusted Drizzle db connection.
 * Never throws — log failures must not block the primary operation.
 */
export const logFamilyActivity = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PostgresJsDatabase<any>,
  params: LogFamilyActivityParams
): Promise<void> => {
  try {
    await db.insert(familyActivityLog).values({
      familyId: params.familyId,
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      metadata: params.metadata ?? null,
    });
  } catch {
    // Logging failures are non-fatal. The caller's primary operation already
    // succeeded; we swallow the error to avoid rolling it back.
  }
};
