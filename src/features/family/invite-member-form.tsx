'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Form, toast } from '@paalstack/react-ui';
import { useForm } from 'react-hook-form';

import { useCreateFamilyInvite } from '@/hooks/mutations';
import {
  assignableFamilyMemberRoles,
  createFamilyInviteSchema,
  type CreateFamilyInviteInput,
} from '@/lib/validations/family';

const ROLE_OPTIONS = assignableFamilyMemberRoles.map((role) => ({
  label: role.charAt(0).toUpperCase() + role.slice(1),
  value: role,
}));

type InviteMemberFormProps = {
  familyId: string;
};

export const InviteMemberForm = ({ familyId }: InviteMemberFormProps) => {
  const { mutateAsync, isPending } = useCreateFamilyInvite();

  const form = useForm<CreateFamilyInviteInput>({
    resolver: zodResolver(createFamilyInviteSchema),
    defaultValues: { familyId, role: 'member' },
  });

  const handleSubmit = async (data: CreateFamilyInviteInput) => {
    try {
      const result = await mutateAsync(data);
      if (result?.emailSent) {
        toast.success(`Invitation sent to ${data.email}`);
      } else {
        toast.success('Invitation created', {
          description: 'Share the link manually — email delivery is not configured.',
        });
      }
      form.reset({ familyId, role: 'member' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invite');
    }
  };

  return (
    <Card
      header={{
        title: 'Invite member',
        description: 'Send an email invitation to join this family',
      }}
    >
      <Form
        form={form}
        onSubmit={handleSubmit}
        fields={[
          {
            type: 'input',
            name: 'email',
            label: 'Email address',
            inputType: 'email',
            required: true,
            placeholder: 'name@example.com',
          },
          {
            type: 'select',
            name: 'role',
            label: 'Role',
            required: true,
            options: ROLE_OPTIONS,
          },
        ]}
        submitText={isPending ? 'Sending…' : 'Send invite'}
        hideResetButton
      />
    </Card>
  );
};
