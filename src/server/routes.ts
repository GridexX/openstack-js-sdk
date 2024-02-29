import express from 'express';
import { OpenStackClient } from '../client';
import {
  ImagesResponse,
  LimitResponse,
  MetricMeasureResponse,
  MetricResponse,
  MetricsResponse,
  ServerResponse,
  ServersResponse,
  TenantUsageRequest,
  TenantUsageResponse,
} from '../types/api';
import { body, validationResult } from 'express-validator';

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: servers
 *     description: Everything about your servers
 *     externalDocs:
 *       description: Find out more
 *       url: http://swagger.io
 *   - name: images
 *     description: Everything about your images
 *   - name: metrics
 *     description: Monitor everything
 *   - name: limits
 *     description: See your compute limits
 * /servers:
 *   get:
 *     tags:
 *       - servers
 *     description: Retrieve the list of the servers
 *     responses:
 *       200:
 *         description: Returns the list of servers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: 123e4567-e89b-12d3-a456-426614174000
 *                   name:
 *                     type: string
 *                     example: vm-server
 *                   links:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         rel:
 *                           type: string
 *                           enum: [self, bookmark]
 *                           example: self
 *                         href:
 *                           type: string
 *                           format: url
 */
router.get('/servers', (req, res) => {
  req.app.locals.openStackClient.getServers().then((response: ServersResponse | undefined) => {
    if (!response) {
      res.status(500).send('Internal Server Error');
      return;
    }
    const servers = response.servers.map((server) => {
      return {
        id: server.id,
        name: server.name,
      };
    });
    res.json(servers);
  });
});

/**
 * @openapi
 * /servers/{serverId}:
 *   get:
 *     tags:
 *       - servers
 *     description: Retrieve details about a servers
 *     responses:
 *       200:
 *         description: Returns the server details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: 123e4567-e89b-12d3-a456-426614174000
 *                 name:
 *                   type: string
 *                   example: vm-server
 *                 links:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rel:
 *                         type: string
 *                         enum: [self, bookmark]
 *                         example: self
 *                       href:
 *                         type: string
 *                         format: url
 */
router.get('/servers/:id', (req, res) => {
  req.app.locals.openStackClient.getServer(req.params.id).then((response: ServerResponse | undefined) => {
    if (!response) {
      res.status(500).send('Internal Server Error');
      return;
    }
    res.json(response);
  });
});

/**
 * @openapi
 * /images:
 *   get:
 *     tags:
 *       - images
 *     description: Retrieve details about images
 *     responses:
 *       200:
 *         description: Returns the server details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 images:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 123e4567-e89b-12d3-a456-426614174000
 *                       name:
 *                         type: string
 *                         example: debian-12.0.0
 *                       size:
 *                         type: number
 *                         example: 1000000
 *                       status:
 *                         type: string
 *                         example: active
 *                       min_ram:
 *                         type: number
 *                         example: 1024
 *                       min_disk:
 *                         type: number
 *                         example: 1024
 *                       disk_format:
 *                         type: string
 *                         example: qcow2
 *                       protected:
 *                         type: boolean
 *                         example: false
 *                       checksum:
 *                         type: string
 *                         example: "800a10df2d369891ed65900bcacacd47"
 */
router.get('/images', (req, res) => {
  req.app.locals.openStackClient.getImages().then((response: ImagesResponse | undefined) => {
    res.json(response);
  });
});

// TODO Verify the query parameters with a validation library
router.get('/metrics', (req, res) => {
  let { limit: limitS, start: startS } = req.query;
  const limit = isNaN(parseInt(limitS as string)) ? 100 : parseInt(limitS as string);
  const start = isNaN(parseInt(startS as string)) ? 0 : parseInt(startS as string);
  const queryParams = { limit, start };
  req.app.locals.openStackClient.getMetrics(queryParams).then((response: MetricsResponse | undefined) => {
    res.json(response);
  });
});

router.get('/metrics/:id', (req, res) => {
  req.app.locals.openStackClient.getMetric(req.params.id).then((response: MetricResponse | undefined) => {
    res.json(response);
  });
});

router.get('/metrics/:id/measure', (req, res) => {
  let { granularity: granularityS, resample: resampleS, aggregationS } = req.query;
  const granularity = isNaN(parseInt(granularityS as string)) ? 100 : parseInt(granularityS as string);
  const resample = isNaN(parseInt(resampleS as string)) ? 0 : parseInt(resampleS as string);
  const aggregation = aggregationS as string;
  const queryParams = { granularity, resample, aggregation };
  req.app.locals.openStackClient
    .getMetricMeasure(req.params.id, queryParams)
    .then((response: MetricMeasureResponse | undefined) => {
      res.json(response);
    });
});

router.get('/limits', (req, res) => {
  req.app.locals.openStackClient.getLimits().then((response: LimitResponse) => {
    res.json(response);
  });
});

router.get(
  '/tenants',
  body('detailed').optional().isNumeric(),
  body('start').optional().isNumeric(),
  body('end').optional().isNumeric(),
  body('limit').optional().isNumeric(),
  body('marker').optional().isString(),
  (req, res) => {
    const result = validationResult(req);
    if (result.isEmpty()) {
      const requestSchema: TenantUsageRequest = {
        detailed: req?.query?.detailed,
        start: req?.query?.start,
        end: req?.query?.end,
        limit: req?.query?.limit,
        marker: req?.query?.marker,
      };

      req.app.locals.openStackClient.getTenantUsage(requestSchema).then((response: TenantUsageResponse) => {
        res.json(response);
      });
    }
    res.send(result.array());
  },
);

export default router;
