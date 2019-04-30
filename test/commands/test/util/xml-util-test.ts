import { expect } from "chai";
import * as path from "path";
import { validXmlFile } from "../../../../src/commands/test/lib/xml-util";

describe("xml util", function () {

  it("should return positive validation result for the correct xml file", async () => {
    const pathToXml: string = path.join(__dirname, "../resources/nunit2_report.xml");

    const isValid: boolean = validXmlFile(pathToXml);

    expect(isValid).to.eql(true);
  });

  it("should return negative validation result for the incorrect xml file", async () => {
    const pathToXml: string = path.join(__dirname, "../resources/broken/nunit_report.xml");

    const isValid: boolean = validXmlFile(pathToXml);

    expect(isValid).to.eql(false);
  });
});
