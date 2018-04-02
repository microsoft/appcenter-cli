//
// Tests for file token store
//

import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import * as rimraf from "rimraf";
import * as temp from "temp";

// Turn on tracking to make sure files are cleaned up.
temp.track();

import { fileExistsSync } from "../../../src/util/misc/fs-helper";
import { TokenEntry } from "../../../src/util/token-store/token-store";
import { createFileTokenStore, FileTokenStore } from "../../../src/util/token-store/file/file-token-store";

describe("File token store", function () {
  it("should be creatable", function () {
    const storePath = temp.path("appcenter-file-cache-test");
    const store = createFileTokenStore(storePath) as FileTokenStore;
    expect(store.getStoreFilePath()).to.equal(storePath);
  });

  describe("when directory does not exist", function () {
    let storeParentPath: string;

    before(function () {
      storeParentPath = temp.path("appcenter-file-cache-test");
      fs.mkdirSync(storeParentPath);
    });

    after(function () {
      rimraf.sync(storeParentPath);
    });

    it("should create directory for token file", function () {
      const storePath = path.join(storeParentPath, "subdir", "token-file");
      const store = createFileTokenStore(storePath) as FileTokenStore;
      store.set("user1", { id: "123", token: "token1" });
      expect(fileExistsSync(storePath)).to.be.true;
    });
  });

  describe("when storing values", function () {
    const storePath = temp.path("appcenter-file-cache-test");
    let store: FileTokenStore;

    before(function () {
      store = createFileTokenStore(storePath) as FileTokenStore;
      store.set("user1", { id: "123", token: "token1"} );
      store.set("user2", { id: "234", token: "a different token" });
    });

    it("should create token file", function () {
      expect(() => fs.statSync(storePath)).to.not.throw;
    });

    it("should retrieve the stored tokens", function () {
      return store.get("user1")
        .then((token: TokenEntry) => {
          expect(token).to.not.be.null;
          expect(token.accessToken.token).to.equal("token1");
        });
    });

    it("should return null if no token present", function () {
      return store.get("nosuchuser")
        .then((token: TokenEntry) => {
          expect(token).to.be.null;
        });
    });

    it("should return null for removed token", function () {
      return store.remove("user1")
        .then(() => store.get("user1"))
        .then((token: TokenEntry) => {
          expect(token).to.be.null;
        });
    });
  });
});
