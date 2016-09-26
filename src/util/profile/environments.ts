// Management for the current environment. Loads from the
// environments.json file in this directory

export interface EnvironmentInfo {
  endpoint: string;
}

// File format for json file
interface EnvironmentsFile {
  defaultEnvironment: string;
  environments: {
    [environmentName: string]: EnvironmentInfo
  };
}

// Loaded data from file
const environmentsData: EnvironmentsFile = require("./environments.json");

export function environments(environmentName: string = environmentsData.defaultEnvironment): EnvironmentInfo {
  return environmentsData.environments[environmentName];
}
