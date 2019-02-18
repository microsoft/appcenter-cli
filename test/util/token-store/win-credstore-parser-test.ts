/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

//
// Tests to verify the parsing used to handle the output of the
// 'creds.exe' wrapper over the Windows credential store
//

import * as _ from "lodash";
import * as from from "from2";
import * as os from "os";
import { expect } from "chai";
import { createParsingStream } from "../../../src/util/token-store/win32/win-credstore-parser";
import { TokenEntry } from "../../../src/util/token-store";
import { WinTokenStore } from "../../../src/util/token-store/win32/win-token-store";

// Dummy data for parsing tests
const entries = {
  entry1:
`Target Name: AppCenterCli:target=userId:someuser@domain.example::resourceId:https\\://management.core.windows.net/
Type: Generic
User Name: creds.exe`,
  entry2:
`Target Name: AzureXplatCli:target=userId:someotheruser@domain.example::resourceId:https\\://management.core.windows.net/
Type: Generic
User Name: creds.exe`,
  entry1WithCredential:
`Target Name: AzureXplatCli:target=userId:someuser@domain.example::resourceId:https\\://management.core.windows.net/
Type: Generic
User Name: creds.exe
Credential: 00010203AABBCCDD`
};

describe("credstore output parsing", function () {
  let parsingResult: any[];

  function parseEntries(entryString: string): Promise<void> {
    parsingResult = [];
    return new Promise<void>((resolve, reject) => {
      const parser = from([entryString]).pipe(createParsingStream());
      parser.on("data", function (data: any): void {
        parsingResult.push(data);
      });
      parser.on("end", function (): void {
        resolve();
      });
    });
  }

  describe("one entry without password", function () {
    before(function () {
      return parseEntries(entries.entry1 + os.EOL);
    });

    it("should have one result", function () {
      expect(parsingResult).to.have.length(1);
    });

    it("should have expected target", function () {
      expect(parsingResult[0].targetName).to
        .equal("AppCenterCli:target=userId:someuser@domain.example::resourceId:https\\://management.core.windows.net/");
    });

    it("should not have a credential", function () {
      expect(parsingResult[0]).to.not.have.property("credential");
    });

    it("should be generic type", function () {
      expect(parsingResult[0].type).to.equal("Generic");
    });

    it("should have creds user name", function () {
      expect(parsingResult[0].userName).to.equal("creds.exe");
    });
  });

  describe("two entries without passwords", function () {
    before(function () {
      return parseEntries(entries.entry1 + os.EOL + os.EOL + entries.entry2);
    });

    it("should have two results", function () {
      expect(parsingResult).to.have.lengthOf(2);
    });

    it("should have expected targets", function () {
      expect(parsingResult[0].targetName).to
        .equal("AppCenterCli:target=userId:someuser@domain.example::resourceId:https\\://management.core.windows.net/");
      expect(parsingResult[1].targetName).to
        .equal("AzureXplatCli:target=userId:someotheruser@domain.example::resourceId:https\\://management.core.windows.net/");
    });
  });

  describe("one entry with credential", function () {
    before(function () {
      return parseEntries(entries.entry1WithCredential + os.EOL);
    });

    it("should have expected credential", function () {
      expect(parsingResult[0].credential).to.equal("00010203AABBCCDD");
    });
  });
});

describe("Parsing output of creds child process", function () {
  if (os.platform() !== "win32") {
    console.log("These tests only run on Windows");
    return;
  }

  const parseResults: TokenEntry[] = [];
  let expectedEntry: TokenEntry = null;

  const testTargetName = "mobileCenterTest@org.example";
  const testToken = { id: "id1", token: "Sekret!" };
  const credStore = new WinTokenStore();

  before(function () {
    return credStore.set(testTargetName, testToken)
      .then(() => {
        return runAndParseOutput();
      });
  });

  after(function () {
    return removeExpectedEntry();
  });

  //
  // Helper functions to do each stage of the setup
  //

  function runAndParseOutput(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      credStore.list()
        .subscribe(
          (entry: TokenEntry) => {
            parseResults.push(entry);
            if (entry.key === testTargetName) {
              expectedEntry = entry;
            }
          },
          (err: Error) => { reject(err); },
          () => { resolve(); }
        );
    });
  }

  function removeExpectedEntry(): Promise<void> {
    return credStore.remove(testTargetName);
  }

  it("should have entries", function () {
    expect(parseResults).to.have.length.above(0);
  });

  it("should have expected entry", function () {
    expect(expectedEntry).to.not.be.null;
  });

  it("should have expected credential id", function () {
    expect(expectedEntry.accessToken.id).to.equal(testToken.id);
  });

  it ("should have expected credential token", function () {
    expect(expectedEntry.accessToken.token).to.equal(testToken.token);
  });
});
