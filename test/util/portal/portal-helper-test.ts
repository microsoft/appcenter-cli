import { expect } from "chai";
import * as PortalHelper from "../../../src/util/portal/portal-helper";

describe("Portal Helper", function () {
  it("should create the proper URLs with slashes", function () {
    const portalBaseUrl = "https://appcenter.ms";
    const appName = "test-app";
    const branchName = "test/branch/01";
    const appOwner = "test-user";
    const buildId = "42";
    //const ownerType = "user";

    const expectedUrl = "https://appcenter.ms/users/test-user/apps/test-app/build/branches/test%2Fbranch%2F01/builds/42";
    const returnedUrl = PortalHelper.getPortalBuildLink(portalBaseUrl, appOwner, appName, branchName, buildId);
    expect(returnedUrl).to.equal(expectedUrl);
  });
});
