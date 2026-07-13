import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import z from 'zod';

extendZodWithOpenApi(z);

export const swaggerRegistry = new OpenAPIRegistry();

export { z };

export function setupSwagger(app: Express): void {
  if (process.env.SWAGGER_ENABLED !== 'true') return;

  const generator = new OpenApiGeneratorV3(swaggerRegistry.definitions);

  const document = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Express Starter API',
      version: '1.0.0',
      description: 'API documentation generated from Zod schemas.',
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Local Development Server',
      },
      {
        url: 'https://api.yourdomain.com',
        description: 'Production Server',
      },
    ],
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(document));
  // Raw spec (useful for client generation)
  app.get('/docs.json', (_req, res) => res.json(document));
}
