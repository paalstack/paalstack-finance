import { z } from 'zod';

export const categoryTypeValues = ['income', 'expense'] as const;

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  type: z.enum(categoryTypeValues),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color')
    .default('#6366f1'),
  icon: z.string().default('tag'),
  parentId: z.string().uuid().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
