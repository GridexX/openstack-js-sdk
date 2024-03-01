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
 *   - name: tenants
 *     description: Everything about your tenants
 * components:
 *   schemas:
 *     TenantUsage:
 *       type: object
 *       properties:
 *         tenant_usages:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               start:
 *                 type: string
 *                 format: date-time
 *                 example: '2023-02-15T00:00:00Z'
 *               stop:
 *                 type: string
 *                 format: date-time
 *                 example: '2023-02-16T00:00:00Z'
 *               tenant_id:
 *                 type: string
 *                 example: 'abc123'
 *               total_hours:
 *                 type: number
 *                 example: 24
 *               total_local_gb_usage:
 *                 type: number
 *                 example: 100
 *               total_memory_mb_usage:
 *                 type: number
 *                 example: 2048
 *               total_vcpus_usage:
 *                 type: number
 *                 example: 4
 *               server_usages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     ended_at:
 *                       type: string
 *                       format: date-time
 *                       example: '2023-02-15T12:00:00Z'
 *                     flavor:
 *                       type: string
 *                       example: 'm1.small'
 *                     hours:
 *                       type: number
 *                       example: 12
 *                     instance_id:
 *                       type: string
 *                       example: '123abc'
 *                     local_gb:
 *                       type: number
 *                       example: 50
 *                     memory_mb:
 *                       type: number
 *                       example: 1024
 *                     name:
 *                       type: string
 *                       example: 'server-1'
 *                     started_at:
 *                       type: string
 *                       format: date-time
 *                       example: '2023-02-15T00:00:00Z'
 *                     state:
 *                       type: string
 *                       example: 'active'
 *                     tenant_id:
 *                       type: string
 *                       example: 'abc123'
 *                     uptime:
 *                       type: number
 *                       example: 43200
 *                     vcpus:
 *                       type: number
 *                       example: 2
 *                 nullable: true
 *         tenant_usages_links:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               href:
 *                 type: string
 *                 format: uri
 *                 example: 'https://example.com/tenant-usages?start=2023-02-15T00:00:00Z&stop=2023-02-17T00:00:00Z'
 *               rel:
 *                 type: string
 *                 example: 'next'
 *     Limit:
 *       type: object
 *       properties:
 *         limits:
 *           type: object
 *           properties:
 *             rate:
 *               type: array
 *             absolute:
 *               type: object
 *               properties:
 *                 maxTotalInstances:
 *                   type: number
 *                   example: 10
 *                 maxTotalCores:
 *                   type: number
 *                   example: 20
 *                 maxTotalRAMSize:
 *                   type: number
 *                   example: 30
 *                 maxServerMeta:
 *                   type: number
 *                   example: 40
 *                 maxImageMeta:
 *                   type: number
 *                   example: 50
 *                 maxPersonality:
 *                   type: number
 *                   example: 60
 *                 maxPersonalitySize:
 *                   type: number
 *                   example: 70
 *                 maxTotalKeypairs:
 *                   type: number
 *                   example: 80
 *                 maxServerGroups:
 *                   type: number
 *                   example: 90
 *                 maxServerGroupMembers:
 *                   type: number
 *                   example: 100
 *                 maxTotalFloatingIps:
 *                   type: number
 *                   example: 110
 *                 maxSecurityGroups:
 *                   type: number
 *                   example: 120
 *                 maxSecurityGroupRules:
 *                   type: number
 *                   example: 130
 *                 totalRAMUsed:
 *                   type: number
 *                   example: 140
 *                 totalCoresUsed:
 *                   type: number
 *                   example: 150
 *                 totalInstancesUsed:
 *                   type: number
 *                   example: 160
 *                 totalFloatingIpsUsed:
 *                   type: number
 *                   example: 170
 *                 totalSecurityGroupsUsed:
 *                   type: number
 *                   example: 180
 *                 totalServerGroupsUsed:
 *                   type: number
 *                   example: 190
 *     MetricMeasure:
 *       type: array
 *       items:
 *         type: array
 *         length: 3
 *     Server:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         name:
 *           type: string
 *           example: vm-server
 *         links:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               rel:
 *                 type: string
 *                 enum: [self, bookmark]
 *                 example: self
 *               href:
 *                 type: string
 *                 format: url
 *     Image:
 *       type: object
 *       properties:
 *         images:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               name:
 *                 type: string
 *                 example: debian-12.0.0
 *               size:
 *                 type: number
 *                 example: 1000000
 *               status:
 *                 type: string
 *                 example: active
 *               min_ram:
 *                 type: number
 *                 example: 1024
 *               min_disk:
 *                 type: number
 *                 example: 1024
 *               disk_format:
 *                 type: string
 *                 example: qcow2
 *               protected:
 *                 type: boolean
 *                 example: false
 *               checksum:
 *                 type: string
 *                 example: "800a10df2d369891ed65900bcacacd47"
 *     Metric:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         creator:
 *           type: string
 *           example: daface1d3f424aaa8c576d2bd1f827be:78a5733d75c24076bdb7b5a3827c1331
 *         name:
 *           type: string
 *           example: memory
 *         unit:
 *           type: string
 *           example: MB
 *         resource_id:
 *           type: string
 *           example: 457fcfa3-9935-56a4-b1b1-c4ae857cb9d0
 *         created_by_user_id:
 *           type: string
 *           example: daface1d3f424aaa8c576d2bd1f827be
 *         created_by_project_id:
 *           type: string
 *           example: 78a5733d75c24076bdb7b5a3827c1331
 *         archive_policy:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               example: ceilometer-low
 *             back_window:
 *               type: integer
 *               example: 0
 *             definition:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   timespan:
 *                     type: string
 *                     example: '30 days, 0:00:00'
 *                   granularity:
 *                     type: string
 *                     example: '0:05:00'
 *                   points:
 *                     type: integer
 *                     example: 8640
 *             aggregation_methods:
 *               type: array
 *               items:
 *                 type: string
 *                 example: mean
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
 *                 $ref: '#/components/schemas/Server'
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
 *                 $ref: '#/components/schemas/Server'
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
 *               $ref: '#/components/schemas/Image'
 */
router.get('/images', (req, res) => {
  req.app.locals.openStackClient.getImages().then((response: ImagesResponse | undefined) => {
    res.json(response);
  });
});

// TODO Verify the query parameters with a validation library
/**
 * @openapi
 * /metrics:
 *   get:
 *     tags:
 *       - metrics
 *     description: Retrieve the list of the metrics
 *     responses:
 *       200:
 *         description: Returns the list of metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Metric'
 */
router.get('/metrics', (req, res) => {
  let { limit: limitS, start: startS } = req.query;
  const limit = isNaN(parseInt(limitS as string)) ? 100 : parseInt(limitS as string);
  const start = isNaN(parseInt(startS as string)) ? 0 : parseInt(startS as string);
  const queryParams = { limit, start };
  req.app.locals.openStackClient.getMetrics(queryParams).then((response: MetricsResponse | undefined) => {
    res.json(response);
  });
});

/**
 * @openapi
 * /metrics/{metricId}:
 *   get:
 *     tags:
 *       - metrics
 *     description: Retrieve one metric by its ID
 *     responses:
 *       200:
 *         description: Returns the metric details
 *         content:
 *           application/json:
 *             schema:
 *                 $ref: '#/components/schemas/Metric'
 */
router.get('/metrics/:id', (req, res) => {
  req.app.locals.openStackClient.getMetric(req.params.id).then((response: MetricResponse | undefined) => {
    res.json(response);
  });
});

/**
 * @openapi
 * /metrics/{metricId}/measure:
 *   get:
 *     tags:
 *       - metrics
 *     description: Retrieve one measure of a metric by its ID
 *     responses:
 *       200:
 *         description: Returns the metric measure details
 *         content:
 *           application/json:
 *             schema:
 *                 $ref: '#/components/schemas/MetricMeasure'
 */
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

/**
 * @openapi
 * /limits:
 *   get:
 *     tags:
 *       - limits
 *     description: Retrieve the limits of the project
 *     responses:
 *       200:
 *         description: Returns the limits of the project
 *         content:
 *           application/json:
 *             schema:
 *                 $ref: '#/components/schemas/Limit'
 */
router.get('/limits', (req, res) => {
  req.app.locals.openStackClient.getLimits().then((response: LimitResponse) => {
    res.json(response);
  });
});

/**
 * @openapi
 * /tenants:
 *   get:
 *     tags:
 *       - tenants
 *     description: Retrieve the Tenants of the project
 *     responses:
 *       200:
 *         description: Returns the tenants of the project
 *         content:
 *           application/json:
 *             schema:
 *                 $ref: '#/components/schemas/TenantUsage'
 */
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
