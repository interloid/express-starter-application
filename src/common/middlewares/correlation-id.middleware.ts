import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = performance.now();
  const correlationId = (req.headers[CORRELATION_ID_HEADER] as string) || randomUUID();
  const requestId = (req.headers[REQUEST_ID_HEADER] as string) || randomUUID();

  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  res.setHeader(REQUEST_ID_HEADER, requestId);

  res.on('finish', () => {
    const duration = performance.now() - start;
    logger.info(
      `Request Id: ${requestId} - ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration.toFixed(0)}ms`,
      {
        correlationId,
        requestId,
        statusCode: res.statusCode,
        durationMs: duration.toFixed(2),
        ip: req.ip,
      },
    );
  });

  next();
};
