import { type Metadata } from 'next';

import { AccountsView } from '@/features/accounts/accounts-view';

export const metadata: Metadata = { title: 'Accounts' };

const AccountsPage = () => <AccountsView />;

export default AccountsPage;
