// Management for the current environment.

export const appCenterEndpointEnvVar = "APPCENTER_ENDPOINT";
export const appCenterLoginEndpointEnvVar = "APPCENTER_LOGIN_ENDPOINT";
export const appCenterPortalEndpointEnvVar = "APPCENTER_PORTAL_ENDPOINT";

export interface EnvironmentInfo {
  endpoint: string;
  loginEndpoint: string;
  portalEndpoint: string;
  description?: string;
}

// File format for json file
interface EnvironmentsFile {
  defaultEnvironment: string;
  environments: {
    [environmentName: string]: EnvironmentInfo
  };
}

// Default environment data
const environmentsData: EnvironmentsFile = {
  defaultEnvironment: "prod",
  environments: {
    dev: {
      endpoint: "https://bifrost-dev.trafficmanager.net",
      loginEndpoint: "https://asgard-dev.trafficmanager.net/cli-login",
      portalEndpoint: "https://asgard-dev.trafficmanager.net",
      description: "Development"
    },
    int: {
      endpoint: "https://bifrost-int.trafficmanager.net",
      loginEndpoint: "https://portal-server-core-integration.dev.avalanch.es/cli-login",
      portalEndpoint: "https://portal-server-core-integration.dev.avalanch.es",
      description: "Integration"
    },
    staging: {
      endpoint: "https://bifrost-staging.trafficmanager.net",
      loginEndpoint: "https://asgard-staging.trafficmanager.net/cli-login",
      portalEndpoint: "https://asgard-staging.trafficmanager.net",
      description: "Staging"
    },
    prod: {
      endpoint: "https://api.appcenter.ms",
      loginEndpoint: "https://appcenter.ms/cli-login",
      portalEndpoint: "https://appcenter.ms",
      description: "Production"
    },
    local: {
      /* tslint:disable:no-http-string */
      endpoint: process.env[appCenterEndpointEnvVar] || "http://localhost:1700",
      loginEndpoint: process.env[appCenterLoginEndpointEnvVar] || null,
      portalEndpoint: process.env[appCenterPortalEndpointEnvVar] || "http://localhost:8080",
      description: "Local Development"
      /* tslint:enable:no-http-string */
    }
  }
};

export function environments(environmentName: string = environmentsData.defaultEnvironment): EnvironmentInfo {
  return environmentsData.environments[environmentName];
}

export function allEnvironments(): EnvironmentsFile {
  return environmentsData;
}

export function defaultEnvironmentName(): string {
  return environmentsData.defaultEnvironment;
}

export function getPortalUrlForEndpoint(endpoint: string) {
  for (const environmentName of Object.keys(environmentsData.environments)) {
    const environment = environmentsData.environments[environmentName];
    if (environment.endpoint === endpoint) {
      return environment.portalEndpoint;
    }
  }

  throw new Error(`Unknown API endpoint - ${endpoint}`);
}
