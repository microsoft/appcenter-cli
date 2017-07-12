import { getLatestSdkVersion } from "../../../src/commands/lib/get-sdk-versions";

import { expect } from "chai";

xdescribe("GetLatestSdkVersion", () => {
  function isValidVersion(version: string): boolean {
    return /(\d+)\.(\d+)\.(\d+)/.test(version);
  }
  
  it("java", async function () {
    this.timeout(5000);
    var version = await getLatestSdkVersion("java");
    expect(isValidVersion(version)).to.eq(true);
  });

  it("objective-c-swift", async function () {
    this.timeout(5000);
    var version = await getLatestSdkVersion("objective-c-swift");
    expect(isValidVersion(version)).to.eq(true);
  });

  it("react-native", async function () {
    this.timeout(5000);
    var version = await getLatestSdkVersion("react-native");
    expect(isValidVersion(version)).to.eq(true);
  });

  it("xamarin", async function () {
    this.timeout(5000);
    var version = await getLatestSdkVersion("xamarin");
    expect(isValidVersion(version)).to.eq(true);
  });
});