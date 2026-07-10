import { NextResponse } from 'next/server';

import { toAppError } from '@/lib/utils/error';
import { type ApiErrorResponse, type ApiSuccessResponse, type PaginatedApiResponse } from '@/types';

/** Standard 2xx JSON envelope for Route Handlers. */
export const apiSuccess = <T>(data: T, init?: ResponseInit): NextResponse<ApiSuccessResponse<T>> =>
  NextResponse.json({ success: true, data }, init);

/** Standard paginated JSON envelope for Route Handlers. */
export const apiPaginated = <T>(
  items: T[],
  { total, page, pageSize }: { total: number; page: number; pageSize: number }
): NextResponse<PaginatedApiResponse<T>> =>
  NextResponse.json({
    success: true,
    data: { items, total, page, pageSize, hasNextPage: page * pageSize < total },
  });

/**
 * Converts any thrown value into a consistent error JSON envelope with the
 * correct HTTP status code. Use directly in a catch block, or via
 * `withApiErrorHandling` to avoid repeating try/catch in every handler.
 */
export const apiError = (error: unknown): NextResponse<ApiErrorResponse> => {
  const appError = toAppError(error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
    },
    { status: appError.statusCode }
  );
};

/**
 * Wraps a Route Handler so any thrown `FinanceError` (or unknown error) is
 * converted into a consistent JSON error response instead of crashing the
 * request or leaking a raw 500 HTML page.
 *
 * @example
 * export const GET = withApiErrorHandling(async (request: NextRequest) => {
 *   const { user, error } = await requireAuth();
 *   if (error) throw new UnauthorizedError();
 *   return apiSuccess(await listAccounts(user.id));
 * });
 */
export const withApiErrorHandling =
  <Args extends unknown[], Res>(handler: (...args: Args) => Promise<NextResponse<Res>>) =>
  async (...args: Args): Promise<NextResponse<Res> | NextResponse<ApiErrorResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      return apiError(error);
    }
  };
