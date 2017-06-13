export function getPortalBuildLink(portalBaseUrl: string, appOwner: string, appName: string, branchName: string, buildId: string): string {
  return `${portalBaseUrl}/users/${appOwner}/apps/${appName}/build/branches/${branchName}/builds/${buildId}`;
}

export function getPortalOrgLink(portalBaseUrl: string, orgName: string): string {
  return `${portalBaseUrl}/orgs/${orgName}`;
}
