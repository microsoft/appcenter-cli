// Management for the current environment.

export interface EnvironmentInfo {
  endpoint: string;
  loginEndpoint: string;
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
      description: "Development"
    },
    int: {
      endpoint: "https://bifrost-int.trafficmanager.net",
      loginEndpoint: "https://asgard-int.trafficmanager.net/cli-login",
      description: "Integration"
    },
    staging: {
      endpoint: "https://bifrost-staging.trafficmanager.net",
      loginEndpoint: "https://asgard-staging.trafficmanager.net/cli-login",
      description: "Staging"
    },
    prod: {
      endpoint: "https://api.mobile.azure.com",
      loginEndpoint: "https://mobile.azure.com/cli-login",
      description: "Production"
    },
    testCloudLocalDev: {
      endpoint: "http://localhost:1700",
      loginEndpoint: null,
      description: "Test Cloud local dev box development"
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
