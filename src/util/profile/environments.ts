// Management for the current environment. Loads from the
// environments.json file in this directory

export interface EnvironmentInfo {
  endpoint: string;
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
    int: {
      endpoint: "https://bifrost-int.trafficmanager.net",
      description: "Integration"
    },
    prod: {
      "endpoint": "https://api.mobile.azure.com",
      description: "Production"
    },
    testCloudLocalDev: {
      "endpoint": "http://localhost:1700",
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
