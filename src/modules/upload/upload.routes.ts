import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { presignHandler } from './upload.controller.js';
import { presignBodySchema } from './upload.schema.js';
import { registerUploadDocs } from './upload.docs.js';

registerUploadDocs();
export const uploadRouter = Router();
uploadRouter.post('/presign', requireAuth, validate({ body: presignBodySchema }), presignHandler);
