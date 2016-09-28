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
  defaultEnvironment: "int",
  environments: {
    int: {
      endpoint: "https://bifrost-int.trafficmanager.net",
      description: "Integration"
    },
    prod: {
      "endpoint": "https://api.sonoma.hockeyapp.com",
      description: "Production"
    }
  }
};

export function environments(environmentName: string = environmentsData.defaultEnvironment): EnvironmentInfo {
  return environmentsData.environments[environmentName];
}

export function allEnvironments(): EnvironmentsFile {
  return environmentsData;
}
