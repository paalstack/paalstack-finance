import { type Metadata } from 'next';

import { ReportsView } from '@/features/reports/reports-view';

export const metadata: Metadata = { title: 'Reports' };

const ReportsPage = () => <ReportsView />;

export default ReportsPage;
