let portalMap: Map<string, string> = new Map<string, string>([
  ["https://bifrost-int.trafficmanager.net", "https://asgard-int.trafficmanager.net"],
  ["https://bifrost-dev.trafficmanager.net", "https://asgard-dev.trafficmanager.net"],
  ["https://bifrost-staging.trafficmanager.net", "https://asgard-staging.trafficmanager.net"],
  ["https://api.mobile.azure.com", "https://mobile.azure.com"]
]);

export function getPortalBaseUrl(apiBasename: string): string {
  return portalMap.has(apiBasename) ? portalMap.get(apiBasename) : apiBasename;
}

export function getPortalBuildLink(portalBaseUrl: string, appOwner: string, appName: string, branchName: string, buildId: string): string {
  return `${portalBaseUrl}/users/${appOwner}/apps/${appName}/build/branches/${branchName}/builds/${buildId}`;
}

export function getPortalOrgLink(portalBaseUrl: string, orgName: string): string {
  return `${portalBaseUrl}/orgs/${orgName}`;
}
