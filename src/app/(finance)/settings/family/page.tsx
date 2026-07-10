import { type Metadata } from 'next';

import { FamilyView } from '@/features/family/family-view';

export const metadata: Metadata = { title: 'Family' };

const FamilySettingsPage = () => <FamilyView />;

export default FamilySettingsPage;
