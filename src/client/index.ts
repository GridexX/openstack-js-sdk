import axios, { AxiosResponse } from 'axios';
import { CloudConfig, ConfigType } from '../types/config';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import {
  AuthBody,
  AuthResponse,
  ImagesResponse,
  ServerResponse,
  ServersResponse,
  imagesResponse,
  serverResponse,
  serversResponse,
  versionResponse,
} from '../types/api';
import api, { removeTrailingSlash } from './generic';
import { z } from 'zod';

export interface OpenStackClient {
  generateToken(): Promise<void>;
}

type ServiceName = 'compute' | 'image' | 'rating';

// Define a type for URLs
type Urls = Record<ServiceName, string | undefined>;

export class OpenStackClient implements OpenStackClient {
  readonly config?: CloudConfig;
  #token?: string;
  #publicUrls: Urls = { compute: undefined, image: undefined, rating: undefined };

  isConnected(): boolean {
    return typeof this.#token !== 'undefined';
  }

  constructor(filePath: string, cloudName: string) {
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
            console.error(`Unsupported auth_type: ${authType}`);
        }
      } else {
        console.error(`Cloud configuration '${cloudName}' not found or missing auth_type.`);
      }
    } catch (error) {
      console.error('Error reading or parsing clouds.yaml:', JSON.stringify(error));
    }
    if (this.config) {
      console.log('Configuration succefully loaded');
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
        console.log('Token succesfully generated !');
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
              console.log(`${serviceName} ${url} ${href}`);
              this.#publicUrls[serviceName as ServiceName] = removeTrailingSlash(href);
            }
          } else {
            this.#publicUrls[serviceName as ServiceName] = removeTrailingSlash(url);
          }
        });

        await Promise.all(promises);
        console.log(`public URLS: ${JSON.stringify(this.#publicUrls)}`);
      } else {
        console.error('Error generating token:', response.data);
      }
    } catch (error) {
      console.error('Error generating token:', error);
    }
  }

  /**
   * Returns the list of the servers scoped to the Config file project and user
   * @returns {Promise<ServersResponse | undefined>} - The list of the Server if the token is defined
   */
  async getServers(): Promise<ServersResponse | undefined> {
    if (!this.#publicUrls.compute) {
      console.error('No public compute url set');
      return undefined;
    }
    if (!this.#token) {
      console.error('No token set');
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
      console.error('No public compute url set');
      return undefined;
    }
    if (!this.#token) {
      console.error('No token set');
      return undefined;
    }
    return await api({
      method: 'GET',
      token: this.#token,
      url: `${this.#publicUrls.compute}/servers/${id}`,
      requestSchema: z.void(),
      responseSchema: serverResponse,
    })();
  }

  async getImages(): Promise<ImagesResponse | undefined> {
    console.log(this.#publicUrls.image);
    return await api({
      method: 'GET',
      token: this.#token,
      url: `${this.#publicUrls.image}/images`,
      requestSchema: z.void(),
      responseSchema: imagesResponse,
    })();
  }
}
