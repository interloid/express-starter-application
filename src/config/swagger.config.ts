import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import z from 'zod';
import { env } from './env.config.js';

extendZodWithOpenApi(z);

export const swaggerRegistry = new OpenAPIRegistry();

export { z };

export function setupSwagger(app: Express): void {
  if (!env.SWAGGER_ENABLED) return;

  swaggerRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  swaggerRegistry.registerComponent('securitySchemes', 'accessTokenAuth', {
    type: 'apiKey',
    in: 'header',
    name: 'access_token',
  });

  swaggerRegistry.registerComponent('securitySchemes', 'refreshTokenAuth', {
    type: 'apiKey',
    in: 'header',
    name: 'refresh_token',
  });
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
  const components = generator.generateComponents();
  if (components.components) {
    document.components = components.components;
  }
  document.security = [{ bearerAuth: [] }, { accessTokenAuth: [] }, { refreshTokenAuth: [] }];

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(document));
  // Raw spec (useful for client generation)
  app.get('/docs.json', (_req, res) => res.json(document));
}
