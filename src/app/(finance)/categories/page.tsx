import { type Metadata } from 'next';

import { CategoriesView } from '@/features/categories/categories-view';

export const metadata: Metadata = { title: 'Categories' };

const CategoriesPage = () => <CategoriesView />;

export default CategoriesPage;
