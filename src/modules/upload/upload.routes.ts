import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { presignHandler } from './upload.controller.js';
import { presignBodySchema } from './upload.schema.js';
import { registerUploadDocs } from './upload.docs.js';

registerUploadDocs();
export const uploadRouter = Router();
uploadRouter.post(
  '/presign',
  requireAuth,
  requirePermission('role:manage'),
  validate({ body: presignBodySchema }),
  presignHandler,
);
