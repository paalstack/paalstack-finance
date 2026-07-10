import { type Metadata } from 'next';

import { BillingView } from '@/features/billing';

export const metadata: Metadata = { title: 'Billing' };

const BillingSettingsPage = () => <BillingView />;

export default BillingSettingsPage;
