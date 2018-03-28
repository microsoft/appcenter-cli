import { isValidVersion, isValidRange } from "../../../../src/commands/codepush/lib/validation-utils";
import { expect } from "chai";

describe("isValidVersion", function () {
  context("when a given version is semver-compliant", function () {
    const semverCompliantVersions = [
      "1.2.0",
      "1.2.3",
      "1.2.10",
    ];

    it("returns true", function () {
      for (const version of semverCompliantVersions) {
        expect(isValidVersion(version)).to.be.true;
      }
    });
  });

  context("when a given version lacks the patch version", function () {
    const majorAndMinorVersions = [
      "1.2",
      "1.10",
    ];

    it("returns true", function () {
      for (const version of majorAndMinorVersions) {
        expect(isValidVersion(version)).to.be.true;
      }
    });
  });

  context("when a given version lacks the minor/patch versions", function () {
    const majorVersions = [
      "1",
      "10"
    ];

    it("returns true", function () {
      for (const version of majorVersions) {
        expect(isValidVersion(version)).to.be.true;
      }
    });
  });

  context("when a given version is invalid", function () {
    const invalidVersions = [
      "1.",
      "1.2.",
      "1.2.3.",
      "1.invalid",
    ];

    it("returns false", function () {
      for (const version of invalidVersions) {
        expect(isValidVersion(version)).to.be.false;
      }
    });
  });
});

describe("isValidRange", function () {
  context("when a given version range is semver-compliant", function () {
    const semverCompliantRanges = [
      "1.2.3",
      "*",
      "1.2.x",
      "1.2.3 - 1.2.7",
      ">=1.2.3 <1.2.7",
      "~1.2.3",
      "^1.2.3",
      "1.2",
      "1",
    ];

    it("returns true", function () {
      for (const range of semverCompliantRanges) {
        expect(isValidRange(range)).to.be.true;
      }
    });
  });

  context("when a given version range is not semver-compliant", function () {
    const invalidRanges = [
      "1.",
      "1.2.",
      "1.2.3.",
      "1.invalid",
    ];

    it("returns false", function () {
      for (const range of invalidRanges) {
        expect(isValidRange(range)).to.be.false;
      }
    });
  });
});
