let portalMap: Map<string, string> = new Map<string, string>([
  ["https://bifrost-int.trafficmanager.net", "https://asgard-int.trafficmanager.net"]
]);

export function getPortalBaseUrl(apiBasename: string) {
  return portalMap.has(apiBasename) ? portalMap.get(apiBasename) : apiBasename;
}

export function getPortalBuildLink(portalBaseUrl: string, appOwner: string, appName: string, branchName: string, buildId: string) {
  return `${portalBaseUrl}/users/${appOwner}/apps/${appName}/build/branches/${branchName}/builds/${buildId}`;
}
