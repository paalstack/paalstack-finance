import { type Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AssistantView } from '@/features/ai';
import { listConversations } from '@/lib/ai';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Assistant' };

const AssistantPage = async () => {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const conversations = await listConversations(user.id);
  return <AssistantView conversations={conversations} />;
};

export default AssistantPage;
