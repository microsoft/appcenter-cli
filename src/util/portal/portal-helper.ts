export function getPortalBuildLink(
  portalBaseUrl: string,
  appOwner: string,
  appName: string,
  branchName: string,
  buildId: string
): string {
  const encodedBranchName = encodeURIComponent(branchName);
  return `${portalBaseUrl}/users/${appOwner}/apps/${appName}/build/branches/${encodedBranchName}/builds/${buildId}`;
}

export function getPortalTestLink(
  portalBaseUrl: string,
  isOrg: boolean,
  appOwner: string,
  appName: string,
  seriesName: string,
  testRunId: string
): string {
  if (isOrg) {
    return encodeURI(`${portalBaseUrl}/orgs/${appOwner}/apps/${appName}/test/series/${seriesName}/runs/${testRunId}`);
  } else {
    return encodeURI(`${portalBaseUrl}/users/${appOwner}/apps/${appName}/test/series/${seriesName}/runs/${testRunId}`);
  }
}

export function getPortalOrgLink(portalBaseUrl: string, orgName: string): string {
  return `${portalBaseUrl}/orgs/${orgName}`;
}

export function getPortalUploadLink(portalBaseUrl: string, ownerName: string, appName: string): string {
  return portalBaseUrl + "/api/v0.1/apps/" + ownerName + "/" + appName + "/uploads/releases";
}

export function getPortalPatchUploadLink(portalBaseUrl: string, ownerName: string, appName: string, uploadId: string): string {
  return portalBaseUrl + "/api/v0.1/apps/" + ownerName + "/" + appName + "/uploads/releases/" + uploadId;
}
