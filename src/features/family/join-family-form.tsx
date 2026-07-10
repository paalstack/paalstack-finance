'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Form, toast } from '@paalstack/react-ui';
import { useForm } from 'react-hook-form';

import { useJoinFamily } from '@/hooks/mutations';
import { joinFamilySchema, type JoinFamilyInput } from '@/lib/validations/family';

export const JoinFamilyForm = () => {
  const { mutateAsync, isPending } = useJoinFamily();

  const form = useForm<JoinFamilyInput>({
    resolver: zodResolver(joinFamilySchema),
  });

  const handleSubmit = async (data: JoinFamilyInput) => {
    try {
      await mutateAsync(data);
      toast.success('Joined family');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join family');
    }
  };

  return (
    <Card
      header={{
        title: 'Join a family',
        description: 'Enter the invite code someone shared with you',
      }}
    >
      <Form
        form={form}
        onSubmit={handleSubmit}
        fields={[
          {
            type: 'input',
            name: 'inviteCode',
            label: 'Invite code',
            required: true,
            placeholder: '7F3K-9QRT',
          },
        ]}
        submitText={isPending ? 'Joining...' : 'Join family'}
        hideResetButton
      />
    </Card>
  );
};
