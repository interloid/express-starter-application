import { swaggerRegistry } from '../config/swagger.config.js';

export function registerCsrfDocs() {
  swaggerRegistry.registerPath({
    method: 'get',
    path: '/csrf-token',
    tags: ['Security'],
    summary: 'Generate CSRF token',
    description: 'Returns a CSRF token to be included in subsequent state-changing requests.',
    responses: {
      200: {
        description: 'CSRF token generated successfully.',
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
    },
  });
}
