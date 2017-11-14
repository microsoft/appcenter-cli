export interface EnvironmentInfo {
  acquisitionEndpoint: string;
  managementEndpoint: string;
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
const codePushEnvironmentsData: EnvironmentsFile = {
  defaultEnvironment: "prod",
  environments: {
    dev: {
      acquisitionEndpoint: "https://codepush-int-legacy.azurewebsites.net/",
      managementEndpoint: "https://codepush-management-int-legacy.azurewebsites.net/",
      description: "Development"
    },
    int: {
      acquisitionEndpoint: "https://codepush-int-legacy.azurewebsites.net/",
      managementEndpoint: "https://codepush-management-int-legacy.azurewebsites.net/",
      description: "Integration"
    },
    staging: {
      acquisitionEndpoint: "https://codepush-staging.azurewebsites.net/",
      managementEndpoint: "http://codepush-management-staging.azurewebsites.net/",
      description: "Staging"
    },
    prod: {
      acquisitionEndpoint: "https://codepush.azurewebsites.net/",
      managementEndpoint: "https://codepush-management.azurewebsites.net/",
      description: "Production"
    }
  }
};

export function environments(environmentName: string = codePushEnvironmentsData.defaultEnvironment): EnvironmentInfo {
  return codePushEnvironmentsData.environments[environmentName];
}
