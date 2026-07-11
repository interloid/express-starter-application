import z from 'zod';
import { swaggerRegistry } from '../../config/swagger.config.js';
import { presignBodySchema } from './upload.schema.js';

export function registerUploadDocs() {
  swaggerRegistry.registerPath({
    method: 'post',
    path: '/upload/presign',
    tags: ['Upload'],
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: presignBodySchema,
          },
        },
      },
      headers: z.object({ access_token: z.string() }),
    },
    responses: {
      200: {
        description: 'Pre-signed upload URL generated successfully',
      },
      400: {
        description: 'Validation error',
      },
      401: {
        description: 'Unauthorized',
      },
    },
  });
}
