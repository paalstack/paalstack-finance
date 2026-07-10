'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Form, toast } from '@paalstack/react-ui';
import { useForm, type Resolver } from 'react-hook-form';

import { useCreateCategory } from '@/hooks/mutations';
import {
  categoryTypeValues,
  createCategorySchema,
  type CreateCategoryInput,
} from '@/lib/validations/category';

type CategoryFormProps = {
  onSuccess?: () => void;
};

export const CategoryForm = ({ onSuccess }: CategoryFormProps) => {
  const { mutateAsync, isPending } = useCreateCategory();

  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema) as Resolver<CreateCategoryInput>,
    defaultValues: { color: '#6366f1', icon: 'tag' },
  });

  const handleSubmit = async (data: CreateCategoryInput) => {
    try {
      await mutateAsync(data);
      toast.success('Category created');
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create category');
    }
  };

  return (
    <Card header={{ title: 'Add custom category' }}>
      <Form
        form={form}
        onSubmit={handleSubmit}
        fields={[
          {
            type: 'input',
            name: 'name',
            label: 'Name',
            required: true,
            placeholder: 'e.g. Coffee',
          },
          {
            type: 'select',
            name: 'type',
            label: 'Type',
            required: true,
            options: categoryTypeValues.map((v) => ({
              label: v.charAt(0).toUpperCase() + v.slice(1),
              value: v,
            })),
          },
          {
            type: 'input',
            name: 'color',
            label: 'Color (hex)',
            placeholder: '#6366f1',
          },
          {
            type: 'input',
            name: 'icon',
            label: 'Icon name',
            placeholder: 'tag',
          },
        ]}
        submitText={isPending ? 'Creating...' : 'Create category'}
        hideResetButton
      />
    </Card>
  );
};
