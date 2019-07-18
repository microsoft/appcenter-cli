import { expect } from "chai";
import { DOMParser, XMLSerializer } from "xmldom";
import * as parser from "fast-xml-parser";
import * as path from "path";
import * as fs from "fs";
import { NUnitXmlUtil } from "../../../../src/commands/test/lib/nunit-xml-util";
import { XmlUtil } from "../../../../src/commands/test/lib/xml-util";

describe("nunit xml util", function () {
  const strXml: string =
'<?xml version="1.0" encoding="utf-8"?>\
<test-results ignored="1" not-run="1">\
<test-suite>\
<test-case name="CreditCardValidator.Droid.UITests.Tests.Test0" executed="True" result="Success">\
<reason>\
<message><![CDATA[]]></message>\
</reason>\
</test-case>\
<test-case name="CreditCardValidator.Droid.UITests.Tests.Test1" executed="False" result="Ignored">\
<reason>\
<message><![CDATA[]]></message>\
</reason>\
</test-case>\
</test-suite>\
<test-suite>\
</test-suite>\
</test-results>';

  const strXml1: string =
'<?xml version="1.0" encoding="utf-8"?>\
<test-results ignored="1" not-run="1">\
<test-suite>\
  <test-suite>\
  </test-suite>\
</test-suite>\
<test-suite>\
</test-suite>\
</test-results>';

  const xmlUtil: NUnitXmlUtil = new NUnitXmlUtil();
  // Large XML file takes time to process:
  this.timeout(4000);

  it("should collect all elements", () => {
    let xml: Document = new DOMParser().parseFromString(strXml);
    const testCases: Element[] = xmlUtil.collectAllElements(xml.documentElement, "test-case");
    let testSuites: Element[] = xmlUtil.collectAllElements(xml.documentElement, "test-suite");

    expect(testCases.length).to.eql(2);
    expect(testSuites.length).to.eql(2);

    xml = new DOMParser().parseFromString(strXml1);
    testSuites = xmlUtil.collectAllElements(xml.documentElement, "test-suite");

    expect(testSuites.length).to.eql(3);
  });

  it("should not throw an exception for a non-existent node", () => {
    const xml: Document = new DOMParser().parseFromString(strXml);
    const testCases: Element[] = xmlUtil.collectAllElements(xml.documentElement, "non-existent-test-case");

    expect(testCases.length).to.eql(0);
  });

  it("should append postfix", () => {
    const xml: Document = new DOMParser().parseFromString(strXml);
    xmlUtil.appendToTestNameTransformation(xml, "_new_test_case_postfix");
    const testCases: Element[] = xmlUtil.collectAllElements(xml.documentElement, "test-case");

    expect(testCases[0].attributes.getNamedItem("name").value)
      .to.eql("CreditCardValidator.Droid.UITests.Tests.Test0_new_test_case_postfix");
    expect(testCases[1].attributes.getNamedItem("name").value)
      .to.eql("CreditCardValidator.Droid.UITests.Tests.Test1_new_test_case_postfix");
  });

  it("should not throw an exception while appending postfix to a non-existent node", () => {
    const xml: Document = new DOMParser().parseFromString(strXml1);
    xmlUtil.appendToTestNameTransformation(xml, "_new_test_case_postfix");
    const testCases: Element[] = xmlUtil.collectAllElements(xml.documentElement, "test-case");

    expect(testCases.length).to.eql(0);
  });

  it("should remove ignored transformation", () => {
    const xml: Document = new DOMParser().parseFromString(strXml);
    xmlUtil.removeIgnoredTransformation(xml);
    const testCases: Element[] = xmlUtil.collectAllElements(xml.documentElement, "test-case");
    const testResults: Element = xmlUtil.collectAllElements(xml.documentElement, "test-results")[0];
    const ignoredAttr: Attr = testResults.attributes.getNamedItem("ignored");
    const notRunAttr: Attr = testResults.attributes.getNamedItem("not-run");

    expect(testCases.length).to.eql(1);
    expect(ignoredAttr.value).to.eql("0");
    expect(notRunAttr.value).to.eql("0");
  });

  it("should remove empty suites", () => {
    const xml: Document = new DOMParser().parseFromString(strXml);
    let testSuites: Element[] = xmlUtil.collectAllElements(xml.documentElement, "test-suite");

    expect(testSuites.length).to.eql(2);

    xmlUtil.removeEmptySuitesTransformation(xml);
    testSuites = xmlUtil.collectAllElements(xml.documentElement, "test-suite");

    expect(testSuites.length).to.eql(1);
  });

  it("should collect only first level children", () => {
    const xml: Document = new DOMParser().parseFromString(strXml1);
    const testSuites: Element[] = xmlUtil.collectChildren(xml.documentElement, "test-suite");

    expect(testSuites.length).to.eql(2);
  });

  it("should count all children", () => {
   const xml: Document = new DOMParser().parseFromString(strXml);
   const testResults: Element = xmlUtil.collectChildren(xml.documentElement, "test-results")[0];

   expect(xmlUtil.countChildren(testResults)).to.eql(8);
  });

  it("should not throw an exception if get null values", () => {
    let result: Element[] = xmlUtil.collectAllElements(null, "");
    expect(result.length).to.eql(0);

    result = xmlUtil.collectAllElements({} as Element, null);
    expect(result.length).to.eql(0);

    result = xmlUtil.collectChildren(null, "");
    expect(result.length).to.eql(0);

    result = xmlUtil.collectChildren({} as Element, null);
    expect(result.length).to.eql(0);

    expect(xmlUtil.countChildren(null)).to.eql(0);
  });

  it("should should identify nunit2 xml correctly", async () => {

    // If
    const pathToArchive: string = path.join(__dirname, "../resources/nunit2_report.xml");
    const xml: Document = new DOMParser(XmlUtil.DOMParserConfig).parseFromString(fs.readFileSync(pathToArchive, "utf-8"), "text/xml");

    // When
    const isNUnit3: boolean = xmlUtil.isNUnit3(xml);

    // Doesn't throw exception
    expect(isNUnit3).to.eql(false);
  });

  it("should should identify nunit3 xml correctly", async () => {

    // If
    const pathToArchive: string = path.join(__dirname, "../resources/nunit3_report.xml");
    const xml: Document = new DOMParser(XmlUtil.DOMParserConfig).parseFromString(fs.readFileSync(pathToArchive, "utf-8"), "text/xml");

    // When
    const isNUnit3: boolean = xmlUtil.isNUnit3(xml);

    // Doesn't throw exception
    expect(isNUnit3).to.eql(true);
  });

  it("should combine nunit2 xmls correctly", async () => {

    // If
    const pathToArchive: string = path.join(__dirname, "../resources/nunit2_xml_zip.zip");

    // When
    const xml: Document = await xmlUtil.mergeXmlResults(pathToArchive);

    // Then
    const finalStrXml: string = new XMLSerializer().serializeToString(xml);

    // Doesn't throw exception
    parser.parse(finalStrXml);
  });

  it("should combine nunit3 xmls correctly", async () => {

    // If
    const pathToArchive: string = path.join(__dirname, "../resources/nunit3_xml_zip.zip");

    // When
    const xml: Document = await xmlUtil.mergeXmlResults(pathToArchive);

    // Then
    const finalStrXml: string = new XMLSerializer().serializeToString(xml);

    // Doesn't throw exception
    parser.parse(finalStrXml);
  });

  it("should throw an explicit exception", async () => {
    let exception = false;
    // If
    const pathToArchive: string = path.join(__dirname, "../resources/broken/nunit_xml_zip.zip");

    // When
    try {
      await xmlUtil.mergeXmlResults(pathToArchive);
    } catch (e) {
      exception = true;
    }

    // Exception was thrown
    expect(exception).to.eql(true);
  });
});
