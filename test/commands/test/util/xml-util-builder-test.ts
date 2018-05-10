import { expect } from "chai";
import { JUnitXmlUtil } from "../../../../src/commands/test/lib/junit-xml-util";
import { NUnitXmlUtil } from "../../../../src/commands/test/lib/nunit-xml-util";
import { XmlUtil } from "../../../../src/commands/test/lib/xml-util";
import { XmlUtilBuilder } from "../../../../src/commands/test/lib/xml-util-builder";

describe("xml util builder", function () {

  it("should create an object of the correct class", () => {
    let util: XmlUtil = XmlUtilBuilder.buildXmlUtil( { nunit_xml_zip : "something" } );
    expect(util.constructor.name).to.eql(NUnitXmlUtil.name);

    util = XmlUtilBuilder.buildXmlUtil( { junit_xml_zip : "something" } );
    expect(util.constructor.name).to.eql(JUnitXmlUtil.name);
  });
});
