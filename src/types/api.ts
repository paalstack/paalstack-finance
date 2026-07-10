import { type PaginationParams } from './finance';

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PaginatedApiResponse<T> = ApiSuccessResponse<{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}>;

export type ApiRequestContext = {
  pagination?: PaginationParams;
};
