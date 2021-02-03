import { expect } from "chai";
import { parseDistributionGroups, printGroups } from "../../../../src/commands/distribute/lib/distribute-util";

describe("Parse distribution groups", () => {
  it("Parse single group", () => {
    const input = "fakeGroup";
    const expected = ["fakeGroup"];
    expect(parseDistributionGroups(input)).to.eql(expected);
  });

  it("Parse multiple groups", () => {
    const input = "fakeGroup,testGroup";
    const expected = ["fakeGroup", "testGroup"];
    expect(parseDistributionGroups(input)).to.eql(expected);
  });
});

describe("Print groups", () => {
  it("Print single group", () => {
    const input = "fakeGroup";
    const expected = "fakeGroup";
    expect(printGroups(input)).to.equal(expected);
  });

  it("Print multiple groups", () => {
    const input = "fakeGroup,testGroup";
    const expected = "fakeGroup, testGroup";
    expect(printGroups(input)).to.equal(expected);
  });
});
