import { expect } from "chai";
import * as _ from "lodash";
import * as os from "os";
import { inspect } from "util";

import { TokenEntry } from "../../../src/util/token-store";
import * as tokenStore from "../../../src/util/token-store/osx/osx-token-store";
import { count } from "rxjs/operators";

describe("storing complete data in keychain", function () {
  if (os.platform() !== "darwin") {
    console.log("These tests only run on Mac OSX");
    return;
  }

  const keychain = tokenStore.createOsxTokenStore();

  const testUser = "appcenter-user";
  const testPassword = "Sekret!";
  const testTokenId = "1234abcd";

  before(() => {
    return keychain.set(testUser, { id: testTokenId, token: testPassword });
  });

  after(() => keychain.remove(testUser));

  it("should have at least one item", async function (): Promise<void> {
    const c = await keychain.list().pipe(count()).toPromise();
    expect(c).to.be.above(0);
  });

  it("should have expected entry", async function (): Promise<void> {
    const entry: TokenEntry = await keychain.get(testUser);
    console.log(`Entry is ${inspect(entry)}`);
    expect(entry).to.be.not.null;
    expect(entry.key).to.equal(testUser);
    expect(entry.accessToken.id).to.equal(testTokenId);
    expect(entry.accessToken.token).to.equal(testPassword);
  });
});

describe("storing data without a tokenId in keychain", function () {
  if (os.platform() !== "darwin") {
    console.log("These tests only run on Mac OSX");
    return;
  }

  const keychain = tokenStore.createOsxTokenStore();

  const testUser = "appcenter-user";
  const testPassword = "Sekret!";

  before(() => {
    return keychain.set(testUser, { id: null, token: testPassword });
  });

  after(() => keychain.remove(testUser));

  it("should have at least one item", async function (): Promise<void> {
    const c = await keychain.list().pipe(count()).toPromise();
    expect(c).to.be.above(0);
  });

  it("should have expected entry", async function (): Promise<void> {
    const entry: TokenEntry = await keychain.get(testUser);
    console.log(`Entry is ${inspect(entry)}`);
    expect(entry).to.be.not.null;
    expect(entry.key).to.equal(testUser);
    expect(entry.accessToken.id).to.equal(undefined);
    expect(entry.accessToken.token).to.equal(testPassword);
  });
});
