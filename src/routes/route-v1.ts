import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { uploadRouter } from '../modules/upload/upload.routes.js';

export const rootRouter = Router();

rootRouter.use('/auth', authRouter);
rootRouter.use('/upload', uploadRouter);
