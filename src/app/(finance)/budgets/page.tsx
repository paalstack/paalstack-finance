import { type Metadata } from 'next';

import { BudgetsView } from '@/features/budgets/budgets-view';

export const metadata: Metadata = { title: 'Budgets' };

const BudgetsPage = () => <BudgetsView />;

export default BudgetsPage;
