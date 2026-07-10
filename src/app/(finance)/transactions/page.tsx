import { type Metadata } from 'next';

import { TransactionsView } from '@/features/transactions/transactions-view';

export const metadata: Metadata = { title: 'Transactions' };

const TransactionsPage = () => <TransactionsView />;

export default TransactionsPage;
