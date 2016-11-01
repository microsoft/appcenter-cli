//
// Tests for file token store
//

import { expect } from "chai";
import * as fs from "fs";
import * as temp from "temp";

// Turn on tracking to make sure files are cleaned up.
temp.track();

import { TokenStore, TokenEntry, TokenKeyType, TokenValueType } from "../../../src/util/token-store/token-store";
import { createFileTokenStore, FileTokenStore } from "../../../src/util/token-store/file/file-token-store";

describe("File token store", function () {
  it("should be creatable", function () {
    const storePath = temp.path("sonoma-file-cache-test");
    const store = createFileTokenStore(storePath) as FileTokenStore;
    expect(store.getStoreFilePath()).to.equal(storePath);
  });

  describe("when storing values", function () {
    const storePath = temp.path("sonoma-file-cache-test");
    let store: FileTokenStore;

    before(function () {
      store = createFileTokenStore(storePath) as FileTokenStore;
      store.set("user1", "token1");
      store.set("user2", "a different token");
    });

    it("should create token file", function () {
      expect(() => fs.statSync(storePath)).to.not.throw;
    });

    it("should retrieve the stored tokens", function () {
      return store.get("user1")
        .then((token: TokenEntry) => {
          expect(token).to.not.be.null;
          expect(token.accessToken).to.equal("token1");
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