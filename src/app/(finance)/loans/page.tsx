import { type Metadata } from 'next';

import { LoansView } from '@/features/loans/loans-view';

export const metadata: Metadata = { title: 'Loans & EMI' };

const LoansPage = () => <LoansView />;

export default LoansPage;
