import { getPortalTestLink } from "../../../../src/util/portal/portal-helper";
import { expect } from "chai";

describe("portal helper test", function () {

  function generateUrl(isOrg: boolean): string {
    return getPortalTestLink("domain.any", isOrg, "owner", "appName", "Series with spaces", "uuid");
  }

  it("should escape url for orgs", () => {
    const url: string = generateUrl(true);
    const spaceIndex: number = url.indexOf(" ");
    expect(spaceIndex).to.eql(-1);
  });

  it("should escape url for users", () => {
    const url: string = generateUrl(false);
    const spaceIndex: number = url.indexOf(" ");
    expect(spaceIndex).to.eql(-1);
  });
});
