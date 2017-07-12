import * as _ from "lodash";

export enum MobileCenterSdkModule {
  None = 0,
  Analytics = 1,
  Crashes = 2,
  Distribute = 4,
  Push = 8,
  All = 15
}

export const AllMobileCenterSdkModules: MobileCenterSdkModule[] = _.range(MobileCenterSdkModule.All).filter(x => (x != 0) && ((x & (x - 1)) == 0));

export function getMobileCenterSdkModulesArray(modules: MobileCenterSdkModule) {
  return AllMobileCenterSdkModules.filter(x => (x & modules) == x);
}