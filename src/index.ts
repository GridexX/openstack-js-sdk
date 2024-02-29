import { createClient } from './client';

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import router from './server/routes';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const app: Express = express();
const pino = pinoHttp();

const openstackConfigPath = process.env.OS_CLOUDS_FILE ?? '';
const openstackCloud = process.env.OS_CLOUD ?? '';
const port = process.env.PORT ?? 3000;
const { logger } = pino;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OpenStack API',
      version: '1.0.0',
      description: 'A simple API to interact with OpenStack',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
      },
    ],
  },
  apis: ['./src/server/routes.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

app.use(cors({ origin: true }));
app.use(express.json());
app.use(pino);
app.use(router);

const main = async (app: Express) => {
  const client = await createClient(openstackConfigPath, openstackCloud);
  if (!client) {
    logger.error('[server] Could not create the OpenStack client');
    process.exit(1);
  }
  app.locals.openStackClient = client;
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to the OpenStack API');
});

app.listen(port, () => {
  logger.info(`[server] Server is running at http://localhost:${port}`);
});

main(app);
