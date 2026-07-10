import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { getCurrentMonthRange } from '@/lib/utils';
import { type DateRange, type TransactionFilter } from '@/types';

type Theme = 'light' | 'dark' | 'system';

type FinanceStoreState = {
  theme: Theme;
  sidebarOpen: boolean;
  activeCurrency: string;
  selectedDateRange: DateRange;
  transactionFilter: TransactionFilter;
};

type FinanceStoreActions = {
  setTheme: (theme: Theme) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveCurrency: (currency: string) => void;
  setSelectedDateRange: (range: DateRange) => void;
  setTransactionFilter: (filter: Partial<TransactionFilter>) => void;
  clearTransactionFilter: () => void;
  reset: () => void;
};

type FinanceStore = FinanceStoreState & FinanceStoreActions;

const initialState: FinanceStoreState = {
  theme: 'system',
  sidebarOpen: true,
  activeCurrency: 'INR',
  selectedDateRange: getCurrentMonthRange(),
  transactionFilter: {},
};

export const useFinanceStore = create<FinanceStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setTheme: (theme) => set({ theme }, false, 'setTheme'),

        setSidebarOpen: (open) => set({ sidebarOpen: open }, false, 'setSidebarOpen'),

        toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen }), false, 'toggleSidebar'),

        setActiveCurrency: (currency) =>
          set({ activeCurrency: currency }, false, 'setActiveCurrency'),

        setSelectedDateRange: (range) =>
          set({ selectedDateRange: range }, false, 'setSelectedDateRange'),

        setTransactionFilter: (filter) =>
          set(
            (s) => ({ transactionFilter: { ...s.transactionFilter, ...filter } }),
            false,
            'setTransactionFilter'
          ),

        clearTransactionFilter: () =>
          set({ transactionFilter: {} }, false, 'clearTransactionFilter'),

        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'paalstack-finance-store',
        partialize: (s) => ({
          theme: s.theme,
          sidebarOpen: s.sidebarOpen,
          activeCurrency: s.activeCurrency,
        }),
      }
    ),
    { name: 'FinanceStore' }
  )
);
