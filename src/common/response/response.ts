import type { Response } from 'express';
import {
  ApiResponse,
  type PaginationMeta,
  type CursorPaginated,
  type JsonValue,
} from './api-response.js';

interface SuccessOptions {
  statusCode?: number;
  message?: string;
  metaData?: Record<string, JsonValue>;
}

export function sendSuccess<T>(res: Response, data: T, opts: SuccessOptions = {}): void {
  const statusCode = opts.statusCode ?? 200;
  res.status(statusCode).json(
    new ApiResponse<T>({
      success: true,
      statusCode,
      message: opts.message ?? 'OK',
      path: res.req.originalUrl,
      data,
      ...(opts.metaData !== undefined && {
        metaData: opts.metaData,
      }),
    }),
  );
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  opts: SuccessOptions = {},
): void {
  const statusCode = opts.statusCode ?? 200;
  res.status(statusCode).json(
    new ApiResponse<T[]>({
      success: true,
      statusCode,
      message: opts.message ?? 'OK',
      path: res.req.originalUrl,
      data,
      paginationMeta: pagination,
      ...(opts.metaData !== undefined && {
        metaData: opts.metaData,
      }),
    }),
  );
}

export function sendCursor<T>(
  res: Response,
  data: T[],
  cursor: CursorPaginated,
  opts: SuccessOptions = {},
): void {
  const statusCode = opts.statusCode ?? 200;
  res.status(statusCode).json(
    new ApiResponse<T[]>({
      success: true,
      statusCode,
      message: opts.message ?? 'OK',
      path: res.req.originalUrl,
      data,
      paginationMeta: cursor,
      ...(opts.metaData !== undefined && {
        metaData: opts.metaData,
      }),
    }),
  );
}
