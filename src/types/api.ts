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
      status: z.enum(['CURRENT', 'EXPERIMENTAL', 'SUPPORTED', 'DEPRECATED']),
      links: z.array(
        z.object({
          rel: z.string(),
          href: z.string().url(),
        }),
      ),
    }),
  ),
});

export const metricAllResponse = z.object({
  id: z.string(),
  creator: z.string(),
  name: z.string(),
  unit: z.string(),
  resource_id: z.string(),
  archive_policy: z.object({
    name: z.string(),
    back_window: z.number(),
    definition: z.array(
      z.object({
        timespan: z.string(),
        granularity: z.string(),
        points: z.number(),
      }),
    ),
    aggregation_methods: z.array(z.string()),
  }),
  created_by_user_id: z.string(),
  created_by_project_id: z.string(),
});

export const metricResponse = metricAllResponse
  .omit({
    resource_id: true,
  })
  .extend({
    resource: z.object({
      creator: z.string(),
      started_at: z.string(),
      revision_start: z.string(),
      ended_at: z.string(),
      user_id: z.string(),
      project_id: z.string(),
      original_resource_id: z.string(),
      id: z.string(),
      type: z.string(),
      revision_end: z.string().optional().or(z.null()),
      created_by_user_id: z.string(),
      created_by_project_id: z.string(),
    }),
  });

export type MetricResponse = z.infer<typeof metricResponse>;

export const metricsResponse = z.array(metricAllResponse);

export type MetricsResponse = z.infer<typeof metricsResponse>;

export const metricMeasureResponse = z.array(
  z.tuple([
    z.string().datetime({ offset: true }), // Date-time string
    z.number(), // Granularity
    z.number(), // Value
  ]),
);

export type MetricMeasureResponse = z.infer<typeof metricMeasureResponse>;

export const limitResponse = z.object({
  limits: z.object({
    rate: z.array(z.any()),
    absolute: z.object({
      maxTotalInstances: z.number(),
      maxTotalCores: z.number(),
      maxTotalRAMSize: z.number(),
      maxServerMeta: z.number(),
      maxImageMeta: z.number(),
      maxPersonality: z.number(),
      maxPersonalitySize: z.number(),
      maxTotalKeypairs: z.number(),
      maxServerGroups: z.number(),
      maxServerGroupMembers: z.number(),
      maxTotalFloatingIps: z.number(),
      maxSecurityGroups: z.number(),
      maxSecurityGroupRules: z.number(),
      totalRAMUsed: z.number(),
      totalCoresUsed: z.number(),
      totalInstancesUsed: z.number(),
      totalFloatingIpsUsed: z.number(),
      totalSecurityGroupsUsed: z.number(),
      totalServerGroupsUsed: z.number(),
    }),
  }),
});

export type LimitResponse = z.infer<typeof limitResponse>;

export const tenantUsageRequest = z.object({
  detailed: z.number().min(0).max(1).optional(),
  start: z.string().datetime({ offset: true }).optional(),
  end: z.string().datetime({ offset: true }).optional(),
  limit: z.number().positive().max(100).optional(),
  marker: z.string().optional(),
});

export type TenantUsageRequest = z.infer<typeof tenantUsageRequest>;

export const tenantUsageResponse = z.object({
  tenant_usages: z.array(
    z.object({
      start: z.string().datetime({ offset: true }),
      stop: z.string().datetime({ offset: true }),
      tenant_id: z.string(),
      total_hours: z.number(),
      total_local_gb_usage: z.number(),
      total_memory_mb_usage: z.number(),
      total_vcpus_usage: z.number(),
      server_usages: z
        .array(
          z.object({
            ended_at: z.string().datetime().or(z.null()),
            flavor: z.string(),
            hours: z.number(),
            instance_id: z.string(),
            local_gb: z.number(),
            memory_mb: z.number(),
            name: z.string(),
            started_at: z.string(),
            state: z.string(),
            tenant_id: z.string(),
            uptime: z.number(),
            vcpus: z.number(),
          }),
        )
        .optional(),
    }),
  ),
  tenant_usages_links: z.array(
    z.object({
      href: z.string().url(),
      rel: z.string(),
    }),
  ),
});

export type TenantUsageResponse = z.infer<typeof tenantUsageResponse>;
