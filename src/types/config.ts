type BaseCloudConfig = {
  authUrl: string;
  identityApiVersion: string;
};

type TotpCloudConfig = BaseCloudConfig & {
  authType: 'v3totp';
  projectName: string;
  projectDomainName: string;
  userDomainName: string;
  username: string;
  passcode: string;
};

type TokenCloudConfig = BaseCloudConfig & {
  authType: 'v3token';
  projectName: string;
  projectDomainName: string;
  token: string;
};

type PasswordCloudConfig = BaseCloudConfig & {
  authType: 'v3password';
  projectName: string;
  projectDomainName: string;
  userDomainName: string;
  username: string;
  password: string;
};

type ApplicationCredentialConfig = BaseCloudConfig & {
  authType: 'v3applicationcredential';
  applicationCredentialId: string;
  applicationCredentialSecret: string;
};

export type CloudConfig = TotpCloudConfig | TokenCloudConfig | PasswordCloudConfig | ApplicationCredentialConfig;

interface AuthConfig {
  auth_url: string;
  project_name?: string;
  project_domain_name?: string;
  user_domain_name?: string;
  username?: string;
  passcode?: string;
  token?: string;
  application_credential_id?: string;
  application_credential_secret?: string;
  password?: string;
}

export interface ConfigType {
  clouds: {
    [cloudName: string]: {
      auth_type?: string;
      auth: AuthConfig;
      identity_api_version: number;
    };
  };
}
