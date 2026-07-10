'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Form, toast } from '@paalstack/react-ui';
import { useForm } from 'react-hook-form';

import { useCreateFamily } from '@/hooks/mutations';
import { createFamilySchema, type CreateFamilyInput } from '@/lib/validations/family';

export const CreateFamilyForm = () => {
  const { mutateAsync, isPending } = useCreateFamily();

  const form = useForm<CreateFamilyInput>({
    resolver: zodResolver(createFamilySchema),
    defaultValues: { currency: 'INR' },
  });

  const handleSubmit = async (data: CreateFamilyInput) => {
    try {
      await mutateAsync(data);
      toast.success('Family created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create family');
    }
  };

  return (
    <Card header={{ title: 'Create a family', description: 'Start sharing finances with others' }}>
      <Form
        form={form}
        onSubmit={handleSubmit}
        fields={[
          {
            type: 'input',
            name: 'name',
            label: 'Family name',
            required: true,
            placeholder: 'The Smith Family',
          },
          { type: 'textarea', name: 'description', label: 'Description', placeholder: 'Optional' },
          {
            type: 'input',
            name: 'currency',
            label: 'Currency',
            required: true,
            placeholder: 'INR',
          },
        ]}
        submitText={isPending ? 'Creating...' : 'Create family'}
        hideResetButton
      />
    </Card>
  );
};
