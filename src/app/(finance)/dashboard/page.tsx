import { type Metadata } from 'next';

import { DashboardView } from '@/features/dashboard/dashboard-view';

export const metadata: Metadata = { title: 'Dashboard' };

const DashboardPage = () => <DashboardView />;

export default DashboardPage;
