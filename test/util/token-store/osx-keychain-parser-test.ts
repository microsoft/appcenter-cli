import { expect } from "chai";
import * as _ from "lodash";
import * as es from "event-stream";
import * as os from "os";
import { inspect } from "util";

import { TokenEntry } from "../../../src/util/token-store";
import * as keychainParser from "../../../src/util/token-store/osx/osx-keychain-parser";
import * as tokenStore from "../../../src/util/token-store/osx/osx-token-store";

type DoneFunc = {(err?: Error): void};

//
// Sample keychain data to test parser
//

/* tslint:disable:no-octal-literal */
const entries = {
  entry1:
    'keychain: "/Users/chris/Library/Keychains/login.keychain"\n' +
    'class: "genp"' + "\n" +
    "attributes:" + "\n" +
    '    0x00000007 <blob>="azure"' + "\n" +
    "    0x00000008 <blob>=<NULL>" + "\n" +
    '    "acct"<blob>="a:b:c:d"' + "\n" +
    '    "cdat"<timedate>=0x32303134303630323137323535385A00  "20140602172558Z\\000"' + "\n" +
    '    "crtr"<uint32>=<NULL>' + "\n" +
    '    "cusi"<sint32>=<NULL>' + "\n" +
    '    "desc"<blob>="active directory token"' + "\n" +
    '    "gena"<blob>=<NULL>' + "\n" +
    '    "icmt"<blob>=<NULL>' + "\n" +
    '    "invi"<sint32>=<NULL>' + "\n" +
    '    "mdat"<timedate>=0x32303134303630323137323535385A00  "20140602172558Z\\000"' + "\n" +
    '    "nega"<sint32>=<NULL>' + "\n" +
    '    "prot"<blob>=<NULL>' + "\n" +
    '    "scrp"<sint32>=<NULL>' + "\n" +
    '    "svce"<blob>="azure"' + "\n" +
    '    "port"<uint32>=0x00000000' + "\n" +
    '    "type"<uint32>=<NULL>' + "\n",

  entry2:
    'keychain: "/Users/chris/Library/Keychains/login.keychain"' + "\n" +
    "class: 0x00000008" + "\n" +
    "attributes:" + "\n" +
    '    0x00000007 <blob>="azure"' + "\n" +
    "    0x00000008 <blob>=<NULL>" + "\n" +
    '    "acct"<blob>="e:f:g:h"' + "\n" +
    '    "cdat"<timedate>=0x32303134303630323137323735385A00  "20140602172758Z\\000"' + "\n" +
    '    "crtr"<uint32>=<NULL>' + "\n" +
    '    "cusi"<sint32>=<NULL>' + "\n" +
    '    "desc"<blob>="active directory token"' + "\n" +
    '    "gena"<blob>=<NULL>' + "\n" +
    '    "icmt"<blob>=<NULL>' + "\n" +
    '    "invi"<sint32>=<NULL>' + "\n" +
    '    "mdat"<timedate>=0x32303134303630323137323735385A00  "20140602172758Z\\000"' + "\n" +
    '    "nega"<sint32>=<NULL>' + "\n" +
    '    "prot"<blob>=<NULL>' + "\n" +
    '    "scrp"<sint32>=<NULL>' + "\n" +
    '    "svce"<blob>="azure"' + "\n" +
    '    "type"<uint32>=<NULL>' + "\n",

  badEntry:
  'keychain: "/Users/kundanap/Library/Keychains/login.keychain"' + "\n" +
  "class: 0x00000008" + "\n" +
  "attributes:" + "\n" +
  '    "acct"<blob>="bad guy"' + "\n" +
  '    "snbr"<blob>=""63X"' + "\n" +
  '    "cenc"<uint32>=0x00000003' + "\n",

  superbadEntry:
  'keychain: "/Users/kundanap/Library/Keychains/login.keychain"' + "\n" +
  "attributes:" + "\n" +
  '    "acct"<blob>="super bad guy"' + "\n"  + "\n" +
  '    0x12321432 <uint32>="$@#%^^$^^&^&%^63X"'
};

describe("security tool output parsing", function () {

  describe("one entry", function () {
    let parsingResult: any[] = [];

    before(function (done: {(err?: Error): void}) {
      const dataSource = es.through();
      dataSource
        .pipe(keychainParser.createOsxSecurityParsingStream())
        .pipe(es.writeArray((err: Error, data: any[]) => {
          parsingResult = data;
          done(err);
        }));
      dataSource.push(entries.entry1);
      dataSource.push(null);
    });

    it("should have one result", function () {
      expect(parsingResult).to.have.lengthOf(1);
    });

    it("should have expected account", function () {
      expect(parsingResult[0].acct).to.equal("a:b:c:d");
    });

    it("should have expected service name", function () {
      expect(parsingResult[0].svce).to.equal("azure");
    });

    it("should have expected description", function () {
      expect(parsingResult[0].desc).to.equal("active directory token");
    });

    it("should not have a password", function () {
      expect(parsingResult[0].password).to.not.exist;
    });
  });

  describe("multiple entries", function () {
    let parsingResult: any[] = [];

    before(function (done: DoneFunc) {
      const dataSource = es.through();
      dataSource
        .pipe(keychainParser.createOsxSecurityParsingStream())
        .pipe(es.writeArray((err: Error, data: any[]) => {
          parsingResult = data;
          done(err);
        }));

      dataSource.push(entries.entry2);
      dataSource.push(entries.entry1);
      dataSource.push(null);
    });

    it("should have two results", function () {
      expect(parsingResult).to.have.lengthOf(2);
    });

    it("should have expected accounts", function () {
      expect(parsingResult[0].acct).to.equal("e:f:g:h");
      expect(parsingResult[1].acct).to.equal("a:b:c:d");
    });
  });

  describe("Load entries with bad attributes", function () {
    let parsingResult: any[] = [];

    before(function (done: DoneFunc) {
      const dataSource = es.through();
      dataSource
        .pipe(keychainParser.createOsxSecurityParsingStream())
        .pipe(es.writeArray((err: Error, data: any[]) => {
          parsingResult = data;
          done(err);
        }));

      dataSource.push(entries.entry1);
      dataSource.push(entries.badEntry);
      dataSource.push(entries.superbadEntry);
      dataSource.push(entries.entry2);
      dataSource.push(null);
    });

    it("should not crash", function () {
      expect(parsingResult).to.have.lengthOf(4);
      expect(parsingResult[0].acct).to.equal("a:b:c:d");
      expect(parsingResult[1].acct).to.equal("bad guy");
      expect(parsingResult[2].acct).to.equal("super bad guy");
      expect(parsingResult[3].acct).to.equal("e:f:g:h");
    });
  });
});

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
    const c = await (keychain.list() as any).count().toPromise();
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
    const c = await (keychain.list() as any).count().toPromise();
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
