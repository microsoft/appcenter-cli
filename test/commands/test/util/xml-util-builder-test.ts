import { expect } from "chai";
import { DOMParser, XMLSerializer } from "xmldom";
import * as xmlLib from "libxmljs";
import * as path from "path";
import { JUnitXmlUtil } from "../../../../src/commands/test/util/junit-xml-util";
import { NUnitXmlUtil } from "../../../../src/commands/test/util/nunit-xml-util";
import { XmlUtil } from "../../../../src/commands/test/util/xml-util";
import { XmlUtilBuilder } from "../../../../src/commands/test/util/xml-util-builder";

describe("xml util builder", function() {

  it("should create an object of the correct class", () => {
    let util: XmlUtil = XmlUtilBuilder.buildXmlUtil( { "nunit_xml_zip" : "something" } );
    expect(util.constructor.name).to.eql(NUnitXmlUtil.name);

    util = XmlUtilBuilder.buildXmlUtil( { "junit_xml_zip" : "something" } );
    expect(util.constructor.name).to.eql(JUnitXmlUtil.name);
  });
});