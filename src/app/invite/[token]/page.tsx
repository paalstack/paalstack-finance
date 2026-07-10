import { type Metadata } from 'next';

import { InviteAcceptView } from '@/features/family/invite-accept-view';

export const metadata: Metadata = { title: 'Accept Invitation' };

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

const InvitePage = async ({ params }: InvitePageProps) => {
  const { token } = await params;
  return <InviteAcceptView token={token} />;
};

export default InvitePage;
