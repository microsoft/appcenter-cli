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

import * as _ from "lodash";
import { expect } from "chai";
import * as cacheEncoding from "../../../src/util/token-store/token-store-encoding";

describe("Token cache encoding", function () {
  describe("string escaping", function () {
    const strings = [
      [ "nospecialcharacters", "nospecialcharacters" ],
      [ ":string:with:colons:", "\\:string\\:with\\:colons\\:" ],
      [ "string\\with\\backslashes\\", "string\\\\with\\\\backslashes\\\\" ],
      [ "\\string:with:\\both", "\\\\string\\:with\\:\\\\both" ]
    ];

    it("should escape strings correctly", function () {
      strings.forEach(function (pair) {
        const original = pair[0];
        const expected = pair[1];
        expect(cacheEncoding.escape(original)).to.equal(expected);
      });
    });

    it("should unescape strings correctly", function () {
      strings.forEach(function (pair) {
        const original = pair[1];
        const expected = pair[0];
        expect(cacheEncoding.unescape(original)).to.equal(expected);
      });
    });
  });

  describe("object encoding", function () {
    const objects: [any, string][] = [
      [
        {
          userId: "user@someorg.example",
          resourceId: "https://some.resource.id",
          tenantId: "1855B651-EA3D-4545-A0A9-447AC90B8717",
          "key:with:colon": "value\\with\\backslashes",
          expiresOn: new Date("2014-06-09T19:00:00.000Z"),
          boolValue: true
        },
        "boolValue:true::expiresOn:2014-06-09T19\\:00\\:00.000Z::key\\:with\\:colon:value\\\\with\\\\backslashes::resourceId:https\\://some.resource.id::tenantId:1855B651-EA3D-4545-A0A9-447AC90B8717::userId:user@someorg.example"
      ]
    ];

    it("should encode objects correctly", function () {
      objects.forEach(function (pair) {
        const obj = pair[0];
        const encoding = pair[1];

        expect(cacheEncoding.encodeObject(obj)).to.equal(encoding);
      });
    });

    it("should encode objects with property that has no value", function () {
      objects.forEach(function (pair) {
        const refreshToken: any = undefined; //leave it uninitialized so to use the undefined status
        const fakedTokenPair = { a: "faked access token", r: refreshToken };
        const encoding = cacheEncoding.encodeObject(fakedTokenPair);
        expect(encoding).to.equal("a:faked access token::r:");
      });
    });

    it("should decode objects correctly", function () {
      objects.forEach(function (pair: [any, string]): void {
        const obj = pair[0];
        const encoding = pair[1];

        const decoded = cacheEncoding.decodeObject(encoding);
        expect(decoded).to.contain.all.keys(Object.keys(_.omit(obj, ["boolValue", "expiresOn"])));
        if (_.has(obj, "boolValue")) {
          expect(decoded.boolValue).to.equal(obj.boolValue.toString());
        }

        if (_.has(obj, "expiresOn")) {
          expect(decoded.expiresOn).to.equal(obj.expiresOn.toISOString());
        }
      });
    });
  });
});
