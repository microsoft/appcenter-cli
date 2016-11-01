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
import * as childProcess from "child_process";
import * as es from "event-stream";
import * as os from "os";
import * as util from "util";
import { expect } from "chai";
import { createParsingStream } from "../../../src/util/token-store/win32/win-credstore-parser";

// Dummy data for parsing tests
const entries = {
  entry1:
`Target Name: AzureXplatCli:target=userId:someuser@domain.example::resourceId:https\\://management.core.windows.net/
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

describe('credstore output parsing', function () {
  let parsingResult: any[];

  function parseEntries(entryString: string, done: {(err?: Error): void}): void {
    parsingResult = [];
    let dataSource = es.through();
    let parser = dataSource.pipe(createParsingStream());
    parser.on('data', function (data: any): void {
      parsingResult.push(data);
    });
    parser.on('end', function (): void {
      done();
    });

    dataSource.push(entryString);
    dataSource.push(null);
  }

  describe('one entry without password', function () {
    before(function (done) {
      parseEntries(entries.entry1, done);
    });

    it('should have one result', function () {
      parsingResult.should.have.length(1);
    });

    it('should have expected target', function () {
      parsingResult[0].targetName.should
        .equal('AzureXplatCli:target=userId:someuser@domain.example::resourceId:https\\://management.core.windows.net/');
    });

    it('should not have a credential', function () {
      parsingResult[0].should.not.have.property('credential');
    });

    it('should be generic type', function () {
      parsingResult[0].type.should.equal('Generic');
    });

    it('should have creds user name', function () {
      parsingResult[0].userName.should.equal('creds.exe');
    });
  });

  describe('two entries without passwords', function () {
    before(function (done) {
      parseEntries(entries.entry1 + os.EOL + entries.entry2, done);
    });

    it('should have two results', function () {
      parsingResult.should.have.length(2);
    });

    it('should have expected targets', function () {
      parsingResult[0].targetName.should
        .equal('AzureXplatCli:target=userId:someuser@domain.example::resourceId:https\\://management.core.windows.net/');
      parsingResult[1].targetName.should
        .equal('AzureXplatCli:target=userId:someotheruser@domain.example::resourceId:https\\://management.core.windows.net/');
    });
  });

  describe('one entry with credential', function () {
    before(function (done) {
      parseEntries(entries.entry1WithCredential + os.EOL, done);
    });

    it('should have expected credential', function () {
      parsingResult[0].credential.should.equal('00010203AABBCCDD');
    });
  });
});

describe('Parsing output of creds child process', function () {
  if (os.platform() !== 'win32') {
    console.log('These tests only run on Windows');
    return;
  }

  let parseResults: string[] = [];
  let expectedEntry:any = null;

  let testTargetName='userId:xplattest@org.example::resourceId:https\\://management.core.windows.net/::tenantId:some-guid';
  let testPassword = 'Sekret!';

  before(function (done) {
    addExpectedEntry(function (err: Error) {
      if (err) { return done(err); }
      runAndParseOutput(function (err: Error) {
        done(err);
      });
    });
  });

  after(function (done: {(err?: Error): void}) {
    removeExpectedEntry(done);
  });

  //
  // Helper functions to do each stage of the setup
  //
  function addExpectedEntry(done) {
    credStore.set(testTargetName, testPassword, done);
  }

  function runAndParseOutput(done) {
    credStore.list()
      .on('data', function (credential) {
        parseResults.push(credential);
        if (credential.targetName === testTargetName) {
          expectedEntry = credential;
        }
      })
      .on('end', function () {
        done();
      });
  }

  function removeExpectedEntry(done) {
    credStore.remove(testTargetName, done);
  }

  it('should have entries', function () {
    parseResults.length.should.be.greaterThan(0);
  });

  it('should have expected entry', function () {
    expectedEntry.should.not.be.null;
  });

  it('should have binary encoded password', function () {
    let decodedCredential = new Buffer(expectedEntry.credential, 'hex').toString('utf8');
    decodedCredential.should.equal(testPassword);
  });
});
