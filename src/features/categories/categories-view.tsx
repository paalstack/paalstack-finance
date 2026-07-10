'use client';

import {
  Badge,
  Box,
  Button,
  Dialog,
  Grid,
  TypographyH3,
  TypographyMuted,
  toast,
} from '@paalstack/react-ui';
import { useState } from 'react';

import { EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { useDeleteCategory } from '@/hooks/mutations';
import { useCategories } from '@/hooks/queries';

import { CategoryForm } from './category-form';

export const CategoriesView = () => {
  const [open, setOpen] = useState(false);
  const { data: categories = [], isLoading } = useCategories();
  const { mutateAsync: deleteCategory } = useDeleteCategory();

  const systemCategories = categories.filter((c) => c.is_system);
  const customCategories = categories.filter((c) => !c.is_system);

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      toast.success('Category deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
    }
  };

  return (
    <Box className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Categories"
        description="System and custom transaction categories"
        actions={
          <Dialog
            open={open}
            onOpenChange={setOpen}
            trigger={<Button size="sm">Add category</Button>}
            header={{ title: 'Add custom category' }}
            contentClassName="max-w-md"
          >
            <CategoryForm onSuccess={() => setOpen(false)} />
          </Dialog>
        }
      />

      {isLoading ? (
        <Box className="p-6">
          <LoadingState />
        </Box>
      ) : (
        <Grid className="gap-6 p-6">
          <Box>
            <TypographyH3 className="mb-3 text-sm font-semibold">System categories</TypographyH3>
            <Box className="flex flex-wrap gap-2">
              {systemCategories.map((cat) => (
                <Badge
                  key={cat.id}
                  variant="outline"
                  className="gap-1.5 px-3 py-1.5 text-xs"
                  style={{ borderColor: cat.color }}
                >
                  <Box className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                  <TypographyMuted className="text-xs opacity-60">{cat.type}</TypographyMuted>
                </Badge>
              ))}
            </Box>
          </Box>

          <Box>
            <TypographyH3 className="mb-3 text-sm font-semibold">Custom categories</TypographyH3>
            {customCategories.length === 0 ? (
              <EmptyState
                title="No custom categories yet"
                description="Create your own categories to better organize transactions."
                action={
                  <Button size="sm" onClick={() => setOpen(true)}>
                    Add category
                  </Button>
                }
              />
            ) : (
              <Grid className="grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {customCategories.map((cat) => (
                  <Box
                    key={cat.id}
                    className="border-border flex items-center justify-between rounded-lg border p-3"
                  >
                    <Box className="flex items-center gap-2">
                      <Box
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <Box>
                        <TypographyMuted className="text-foreground text-sm font-medium">
                          {cat.name}
                        </TypographyMuted>
                        <Badge variant="secondary" className="text-xs">
                          {cat.type}
                        </Badge>
                      </Box>
                    </Box>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive text-xs"
                      onClick={() => void handleDelete(cat.id)}
                    >
                      Delete
                    </Button>
                  </Box>
                ))}
              </Grid>
            )}
          </Box>
        </Grid>
      )}
    </Box>
  );
};
