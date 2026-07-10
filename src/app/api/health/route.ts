import { apiSuccess } from '@/lib/api';

export const GET = () => {
  return apiSuccess({
    status: 'ok',
    service: 'paalstack-finance',
    timestamp: new Date().toISOString(),
  });
};
