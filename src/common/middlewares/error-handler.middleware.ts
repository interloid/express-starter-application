import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiResponse, type ApiError } from '../response/api-response.js';
import { HttpError } from '../error/http-errors.js';
import { logger } from '../../utils/logger.js';

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 4th arg required so Express treats this as an error handler
  _next: NextFunction,
): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: ApiError[] | undefined;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.issues.map((issue) => ({
      field: issue.path.join('.') || undefined,
      message: issue.message,
    }));
  } else if (err instanceof HttpError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof Error) {
    logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  }

  res.status(statusCode).json(
    new ApiResponse<never>({
      success: false,
      statusCode,
      message,
      path: req.originalUrl,
      ...(errors !== undefined && { errors }),
    }),
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(
    new ApiResponse<never>({
      success: false,
      statusCode: 404,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      path: req.originalUrl,
    }),
  );
}
