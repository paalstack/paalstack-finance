import type { NewCategory } from '@/lib/db/schema';

type DefaultCategory = Pick<NewCategory, 'name' | 'slug' | 'type' | 'icon' | 'color' | 'sortOrder'>;

export const defaultExpenseCategories: DefaultCategory[] = [
  { name: 'Food', slug: 'food', type: 'expense', icon: 'utensils', color: '#f97316', sortOrder: 0 },
  {
    name: 'Groceries',
    slug: 'groceries',
    type: 'expense',
    icon: 'shopping-cart',
    color: '#22c55e',
    sortOrder: 1,
  },
  {
    name: 'Bills',
    slug: 'bills',
    type: 'expense',
    icon: 'receipt',
    color: '#eab308',
    sortOrder: 2,
  },
  {
    name: 'Transport',
    slug: 'transport',
    type: 'expense',
    icon: 'car',
    color: '#3b82f6',
    sortOrder: 3,
  },
  { name: 'Baby', slug: 'baby', type: 'expense', icon: 'baby', color: '#ec4899', sortOrder: 4 },
  {
    name: 'Shopping',
    slug: 'shopping',
    type: 'expense',
    icon: 'shopping-bag',
    color: '#a855f7',
    sortOrder: 5,
  },
  {
    name: 'Health',
    slug: 'health',
    type: 'expense',
    icon: 'heart-pulse',
    color: '#ef4444',
    sortOrder: 6,
  },
  { name: 'EMI', slug: 'emi', type: 'expense', icon: 'landmark', color: '#0ea5e9', sortOrder: 7 },
  {
    name: 'Others',
    slug: 'others',
    type: 'expense',
    icon: 'more-horizontal',
    color: '#64748b',
    sortOrder: 8,
  },
  {
    name: 'Insurance',
    slug: 'insurance',
    type: 'expense',
    icon: 'shield',
    color: '#0891b2',
    sortOrder: 9,
  },
  {
    name: 'Medical',
    slug: 'medical',
    type: 'expense',
    icon: 'stethoscope',
    color: '#dc2626',
    sortOrder: 10,
  },
  {
    name: 'Travel',
    slug: 'travel',
    type: 'expense',
    icon: 'plane',
    color: '#7c3aed',
    sortOrder: 11,
  },
];

export const defaultIncomeCategories: DefaultCategory[] = [
  {
    name: 'Salary',
    slug: 'salary',
    type: 'income',
    icon: 'wallet',
    color: '#22c55e',
    sortOrder: 0,
  },
  {
    name: 'Freelance',
    slug: 'freelance',
    type: 'income',
    icon: 'laptop',
    color: '#0ea5e9',
    sortOrder: 1,
  },
  {
    name: 'Business',
    slug: 'business',
    type: 'income',
    icon: 'briefcase',
    color: '#8b5cf6',
    sortOrder: 2,
  },
  {
    name: 'Other',
    slug: 'other',
    type: 'income',
    icon: 'circle-dollar-sign',
    color: '#64748b',
    sortOrder: 3,
  },
];

export const defaultCategories: DefaultCategory[] = [
  ...defaultExpenseCategories,
  ...defaultIncomeCategories,
];
