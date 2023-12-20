import { z } from 'zod';

type AuthMethod = 'application_credential' | 'password';

export type ApplicationCredential = {
  id: string;
  secret: string;
};

// TODO See how to improve that part
export interface AuthBody {
  auth: {
    identity: {
      methods: AuthMethod[];
      // See: https://docs.openstack.org/api-ref/identity/v3/#authenticating-with-an-application-credential
      application_credential?: ApplicationCredential;
      password?: {
        user: {
          name: string;
          password: string;
          domain?: {
            name: string;
          };
        };
      };
    };
  };
}

const AuthResponse = z.object({
  token: z.object({
    catalog: z.array(
      z.object({
        endpoints: z.array(
          z.object({
            id: z.string(),
            interface: z.enum(['admin', 'internal', 'public']),
            region_id: z.string(),
            url: z.string().url(),
            region: z.string(),
          }),
        ),
        type: z.string(),
      }),
    ),
    application_credential: z.object({
      id: z.string(),
      name: z.string(),
      restricted: z.boolean(),
    }),
  }),
});

export type AuthResponse = z.infer<typeof AuthResponse>;

export const serversResponse = z.object({
  servers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      links: z.array(
        z.object({
          rel: z.enum(['self', 'bookmark']),
          href: z.string().url(),
        }),
      ),
    }),
  ),
});

export type ServersResponse = z.infer<typeof serversResponse>;

export const serverResponse = z.object({
  server: z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    tenant_id: z.string(),
    user_id: z.string(),
    image: z.string(),
    flavor: z.object({}),
    created: z.string().datetime(),
    updated: z.string().datetime(),
  }),
});

export type ServerResponse = z.infer<typeof serverResponse>;

export const imagesResponse = z.object({
  images: z.array(
    z.object({
      name: z.string(),
      size: z.number(),
      status: z.string(),
      checksum: z.string(),
      protected: z.boolean(),
      min_ram: z.number(),
      min_disk: z.number(),
      disk_format: z.string(),
    }),
  ),
});

export type ImagesResponse = z.infer<typeof imagesResponse>;

export const versionResponse = z.object({
  versions: z.array(
    z.object({
      id: z.string(),
      status: z.enum(['CURRENT', 'SUPPORTED', 'DEPRECATED']),
      links: z.array(
        z.object({
          rel: z.string(),
          href: z.string().url(),
        }),
      ),
    }),
  ),
});
