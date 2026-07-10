import { type Request, type Response, type NextFunction } from 'express';
import { type ZodType } from 'zod';

type RequestSchema = ZodType<{
  body?: unknown;
  query?: unknown;
  params?: unknown;
}>;

export const validate =
  <T extends RequestSchema>(schema: T) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body as unknown,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues,
      });
      return;
    }

    const data = result.data;
    if (data.body !== undefined) req.body = data.body;
    if (data.query !== undefined) Object.assign(req.query, data.query);
    if (data.params !== undefined) Object.assign(req.params, data.params);

    next();
  };
