import axios, { AxiosResponse } from 'axios';
import { CloudConfig, ConfigType } from '../types/config';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import {
  AuthBody,
  AuthResponse,
  ImagesResponse,
  LimitResponse,
  MetricMeasureResponse,
  MetricResponse,
  MetricsResponse,
  ServerResponse,
  ServersResponse,
  TenantUsageRequest,
  TenantUsageResponse,
  imagesResponse,
  limitResponse,
  metricMeasureResponse,
  metricResponse,
  metricsResponse,
  serverResponse,
  serversResponse,
  tenantUsageRequest,
  tenantUsageResponse,
  versionResponse,
} from '../types/api';
import api, { removeTrailingSlash } from './generic';
import { z } from 'zod';
import { Logger, pino } from 'pino';

export interface OpenStackClient {
  generateToken(): Promise<void>;
}

type ServiceName = 'compute' | 'image' | 'rating' | 'metric';

// Define a type for URLs
type Urls = Record<ServiceName, string | undefined>;

export class OpenStackClient implements OpenStackClient {
  readonly config?: CloudConfig;
  #logger: Logger<never>;
  #token?: string;
  #publicUrls: Urls = { compute: undefined, image: undefined, rating: undefined, metric: undefined };

  isConnected(): boolean {
    return typeof this.#token !== 'undefined';
  }

  constructor(filePath: string, cloudName: string) {
    this.#logger = pino({ mixin: () => ({ context: 'OpenStackClient' }) });

    try {
      // Read the content of the clouds.yaml file
      const configFile = readFileSync(filePath, 'utf8');
      const config: ConfigType = load(configFile) as ConfigType;

      // Extract the specified fields based on auth_type
      const cloudConfig = config.clouds[cloudName];

      if (cloudConfig && cloudConfig.auth_type) {
        const authType = cloudConfig.auth_type.toLowerCase();
        const identityApiVersion = `v${cloudConfig.identity_api_version}`;

        switch (authType) {
          // TODO Verify that each field is setup in the YAML file
          case 'v3totp':
            this.config = {
              identityApiVersion,
              authType,
              authUrl: cloudConfig.auth.auth_url,
              projectName: cloudConfig.auth.project_name ?? '',
              projectDomainName: cloudConfig.auth.project_domain_name ?? '',
              userDomainName: cloudConfig.auth.user_domain_name ?? '',
              username: cloudConfig.auth.username ?? '',
              passcode: cloudConfig.auth.passcode ?? '',
            };
            break;
          case 'v3token':
            this.config = {
              identityApiVersion,
              authType,
              authUrl: cloudConfig.auth.auth_url,
              projectName: cloudConfig.auth.project_name ?? '',
              projectDomainName: cloudConfig.auth.project_domain_name ?? '',
              token: cloudConfig.auth.token ?? '',
            };
            break;
          case 'v3applicationcredential':
            this.config = {
              identityApiVersion,
              authType,
              authUrl: cloudConfig.auth.auth_url,
              applicationCredentialId: cloudConfig.auth.application_credential_id ?? '',
              applicationCredentialSecret: cloudConfig.auth.application_credential_secret ?? '',
            };
            break;
          case 'v3password':
            this.config = {
              identityApiVersion,
              authType,
              authUrl: cloudConfig.auth.auth_url,
              projectName: cloudConfig.auth.project_name ?? '',
              projectDomainName: cloudConfig.auth.project_domain_name ?? '',
              userDomainName: cloudConfig.auth.user_domain_name ?? '',
              username: cloudConfig.auth.username ?? '',
              password: cloudConfig.auth.password ?? '',
            };
            break;
          default:
            this.#logger.error(`Unsupported auth_type: ${authType}`);
        }
      } else {
        this.#logger.error(`Cloud configuration '${cloudName}' not found or missing auth_type.`);
      }
    } catch (error) {
      this.#logger.error('Error reading or parsing clouds.yaml:', JSON.stringify(error));
    }
    if (this.config) {
      this.#logger.info({ context: 'OpenStackClient' }, 'Configuration succefully loaded');
    }
  }

  /**
   * Generate a token based on the configuration file provided
   * This method also save the Public URL of the different services
   * @returns {void} - Add the token in the field of the class
   */
  async generateToken(): Promise<void> {
    if (!this.config) {
      return;
    }
    const route = `${this.config.authUrl}/${this.config.identityApiVersion}/auth/tokens`;
    const body: AuthBody = {
      auth: {
        identity: {
          methods: ['application_credential'],
          application_credential: {
            id: this.config.authType === 'v3applicationcredential' ? this.config.applicationCredentialId : '',
            secret: this.config.authType === 'v3applicationcredential' ? this.config.applicationCredentialSecret : '',
          },
        },
      },
    };
    try {
      const response: AxiosResponse<AuthResponse> = await axios.post(route, body, { validateStatus: null });
      const token: string | undefined = response.headers['x-subject-token'];

      if (response.status === 201 && token) {
        this.#logger.info('Token succesfully generated !');
        this.#token = token;

        // Find the Public associated type in the request and add it to the
        const promises = Object.keys(this.#publicUrls).map(async (serviceName: string) => {
          let url =
            response.data.token.catalog
              .find((c) => c.type === serviceName)
              ?.endpoints.find((e) => e.interface === 'public')?.url ?? '';

          // If the url doesn't contains the API version needed for the call, we add it thanks to an api call
          if (!/.*\/v[0-9\.]+\/?.*$/.test(url)) {
            const { versions } = await api({
              method: 'GET',
              token: this.#token,
              url,
              requestSchema: z.void(),
              responseSchema: versionResponse,
            })();

            // Find the new link of the current version of the api
            const href =
              versions.find((version) => version.status === 'CURRENT')?.links.find((l) => l.rel === 'self')?.href ??
              undefined;
            if (href) {
              this.#publicUrls[serviceName as ServiceName] = removeTrailingSlash(href);
            }
          } else {
            this.#publicUrls[serviceName as ServiceName] = removeTrailingSlash(url);
          }
        });

        await Promise.all(promises);
        this.#logger.info({ public_urls: this.#publicUrls });
        // this.#logger.info(`public URLS: ${JSON.stringify(this.#publicUrls)}`);
      } else {
        this.#logger.error('Error generating token:' + JSON.stringify(response.data));
      }
    } catch (error) {
      this.#logger.error('Error generating token:'+ JSON.stringify(error));
    }
  }

  /**
   * Returns the list of the servers scoped to the Config file project and user
   * @returns {Promise<ServersResponse | undefined>} - The list of the Server if the token is defined
   */
  async getServers(): Promise<ServersResponse | undefined> {
    if (!this.#publicUrls.compute) {
      this.#logger.error('No public compute url set');
      return undefined;
    }
    if (!this.#token) {
      this.#logger.error('No token set');
      return undefined;
    }
    return await api({
      method: 'GET',
      token: this.#token,
      url: `${this.#publicUrls.compute}/servers`,
      requestSchema: z.void(),
      responseSchema: serversResponse,
    })();
  }

  async getServer(id: string): Promise<ServerResponse | undefined> {
    if (!this.#publicUrls.compute) {
      this.#logger.error('No public compute url set');
      return undefined;
    }
    if (!this.#token) {
      this.#logger.error('No token set');
      return undefined;
    }
    const response = api({
      method: 'GET',
      token: this.#token,
      url: `${this.#publicUrls.compute}/servers/${id}`,
      requestSchema: z.void(),
      responseSchema: serverResponse,
    })();

    if (!response) {
      throw new Error('Server not found');
    }

    return response;
  }

  async getImages(): Promise<ImagesResponse | undefined> {
    this.#logger.info(this.#publicUrls.image);
    return await api({
      method: 'GET',
      token: this.#token,
      url: `${this.#publicUrls.image}/images`,
      requestSchema: z.void(),
      responseSchema: imagesResponse,
    })();
  }

  async getMetrics(queryParams?: { limit: number; start: number }): Promise<MetricsResponse | undefined> {
    const urlObject = new URL(`${this.#publicUrls.metric}/metric`);
    if (queryParams) {
      urlObject.searchParams.set('start', `${queryParams.start}`);
      urlObject.searchParams.set('limit', `${queryParams.limit}`);
    }
    const url = urlObject.toString();
    return await api({
      method: 'GET',
      token: this.#token,
      url,
      requestSchema: z.void(),
      responseSchema: metricsResponse,
    })();
  }

  async getMetric(metricId: string): Promise<MetricResponse | undefined> {
    return await api({
      method: 'GET',
      token: this.#token,
      url: `${this.#publicUrls.metric}/metric/${metricId}`,
      requestSchema: z.void(),
      responseSchema: metricResponse,
    })();
  }

  // See the documentation: https://gnocchi.osci.io/rest.html#filter
  async getMetricMeasure(
    metricId: string,
    queryParams?: { granularity: number; resample: number; aggregation: string },
  ): Promise<MetricMeasureResponse | undefined> {
    const urlObject = new URL(`${this.#publicUrls.metric}/metric/${metricId}/measures`);
    if (queryParams) {
      // urlObject.searchParams.set('granularity', `${queryParams.granularity}`);
      // urlObject.searchParams.set('resample', `${queryParams.resample}`);
      // urlObject.searchParams.set('aggregation', `${queryParams.aggregation}`);
    }
    const url = urlObject.toString();
    return await api({
      method: 'GET',
      token: this.#token,
      url,
      requestSchema: z.void(),
      responseSchema: metricMeasureResponse,
    })();
  }

  async getLimits(): Promise<LimitResponse> {
    return await api({
      method: 'GET',
      token: this.#token,
      url: `${this.#publicUrls.compute}/limits`,
      requestSchema: z.void(),
      responseSchema: limitResponse,
    })();
  }

  // https://docs.openstack.org/api-ref/compute/#list-tenant-usage-statistics-for-all-tenants
  async getTenantUsage(requestSchema: TenantUsageRequest): Promise<TenantUsageResponse> {
    return await api({
      method: 'GET',
      token: this.#token,
      url: `${this.#publicUrls.compute}/os-simple-tenant-usage`,
      requestSchema: tenantUsageRequest,
      responseSchema: tenantUsageResponse,
    })(requestSchema);
  }
}

/**
 * Read clouds.yaml file and extract fields based on auth_type.
 * @param {string} filePath - Path to the clouds.yaml file.
 * @param {string} cloudName - Name of the cloud configuration to extract.
 * @returns {OpenStackClient} - The OpenStackClient
 */
export async function createClient(filePath: string, cloudName: string): Promise<OpenStackClient | null> {
  const client = new OpenStackClient(filePath, cloudName);
  await client.generateToken();
  if (!client.isConnected()) {
    return null;
  }
  return client;
}
