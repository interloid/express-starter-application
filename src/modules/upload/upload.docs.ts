import { swaggerRegistry } from '../../config/swagger.config.js';
import { presignBodySchema } from './upload.schema.js';

export function registerUploadDocs() {
  swaggerRegistry.registerPath({
    method: 'post',
    path: '/api/v1/upload/presign',
    tags: ['Upload'],
    security: [{ accessTokenAuth: [] }, { refreshTokenAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: presignBodySchema,
          },
        },
      },
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
