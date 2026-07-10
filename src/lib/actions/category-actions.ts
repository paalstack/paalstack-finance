'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { assertAuthWrite } from '@/lib/actions/_shared/access';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { ForbiddenError } from '@/lib/utils/error';
import { logger } from '@/lib/utils/logger';
import { type CreateCategoryInput, createCategorySchema } from '@/lib/validations/category';
import { type ActionResult } from '@/types';

import type { Category } from '@/lib/db/schema/categories';

const revalidate = () => revalidatePath('/', 'layout');

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const createCategoryAction = async (
  input: CreateCategoryInput
): Promise<ActionResult<Category>> => {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { userId } = await assertAuthWrite();
    const data = parsed.data;

    const [category] = await db
      .insert(categories)
      .values({
        userId,
        name: data.name,
        slug: toSlug(data.name),
        type: data.type,
        color: data.color,
        icon: data.icon,
        parentId: data.parentId ?? null,
        isSystem: false,
      })
      .returning();

    if (!category) return { success: false, error: 'Failed to create category' };

    revalidate();
    return { success: true, data: category };
  } catch (error) {
    logger.error('[createCategoryAction]', { error });
    return { success: false, error: 'Failed to create category' };
  }
};

export const deleteCategoryAction = async (id: string): Promise<ActionResult<{ id: string }>> => {
  try {
    const { userId } = await assertAuthWrite();

    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });
    if (!existing) return { success: false, error: 'Category not found' };
    if (existing.isSystem) throw new ForbiddenError('Cannot delete system categories');
    if (existing.userId !== userId) return { success: false, error: 'Category not found' };

    await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));

    revalidate();
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { success: false, error: error.message };
    }
    logger.error('[deleteCategoryAction]', { error });
    return { success: false, error: 'Failed to delete category' };
  }
};
