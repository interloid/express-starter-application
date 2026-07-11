import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../common/error/http-errors.js';
import { createPresignedUploadPost } from './upload.service.js';
import { sendSuccess } from '../../common/response/response.js';

export async function presignHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const { contentType } = req.body as { contentType: string };
    const result = await createPresignedUploadPost(req.user.id, contentType);
    sendSuccess(res, result, { message: 'Upload URL generated' });
  } catch (err) {
    next(err);
  }
}
