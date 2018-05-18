export function getPortalBuildLink(portalBaseUrl: string, appOwner: string, appName: string, branchName: string, buildId: string): string {
  return `${portalBaseUrl}/users/${appOwner}/apps/${appName}/build/branches/${branchName}/builds/${buildId}`;
}

export function getPortalTestLink(portalBaseUrl: string, isOrg: boolean, appOwner: string, appName: string, seriesName: string, testRunId: string): string {
  if (isOrg) {
    return encodeURI(`${portalBaseUrl}/orgs/${appOwner}/apps/${appName}/test/series/${seriesName}/runs/${testRunId}`);
  } else {
    return encodeURI(`${portalBaseUrl}/users/${appOwner}/apps/${appName}/test/series/${seriesName}/runs/${testRunId}`);
  }
}

export function getPortalOrgLink(portalBaseUrl: string, orgName: string): string {
  return `${portalBaseUrl}/orgs/${orgName}`;
}
