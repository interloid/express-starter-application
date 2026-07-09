import { swaggerRegistry } from '../../../config/swagger.config.js';

export function registerHealthDocs() {
  swaggerRegistry.registerPath({
    method: 'get',
    path: '/health/live',
    tags: ['Health'],

    responses: {
      200: {
        description: 'Check the app current status',
        content: {
          'application/json': {
            schema: { properties: { status: { type: 'string' }, timestamp: { type: 'string' } } },
            example: { status: 'ok', timestamp: '' },
          },
        },
      },
      429: { description: 'Too many attempts' },
    },
  });

  swaggerRegistry.registerPath({
    method: 'get',
    path: '/health/ready',
    tags: ['Health'],
    responses: {
      200: {
        description: 'Check the servers ready state',
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: {
              status: 'up',
              info: {
                memory_heap: {
                  status: 'up',
                  used: '45MB',
                  limit: '300MB',
                },
                memory_rss: {
                  status: 'up',
                  used: '120MB',
                  limit: '500MB',
                },
              },
              version: {
                commit: 'a1b2c3d',
                buildTime: '2026-07-09T10:15:30Z',
              },
              timestamp: '2026-07-09T10:15:30Z',
            },
          },
        },
      },
    },
  });
}
