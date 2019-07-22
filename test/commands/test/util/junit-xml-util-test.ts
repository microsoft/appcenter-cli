import { expect } from "chai";
import { DOMParser, XMLSerializer } from "xmldom";
import * as parser from "fast-xml-parser";
import * as path from "path";
import { JUnitXmlUtil } from "../../../../src/commands/test/lib/junit-xml-util";

describe("junit xml util", function () {
  const strXml: string =
'<?xml version="1.0" encoding="utf-8"?>\
<testsuite tests="2" failures="1" name="com.microsoft.altframeworktraining.StartAppTest" time="56.187" errors="8" skipped="1">\
<testcase classname="com.microsoft.altframeworktraining.StartAppTest" name="canStartAppInTest" time="33.5"/>\
<testcase classname="com.microsoft.altframeworktraining.StartAppTest" name="canStartAppInTest2" time="22.687"/>\
</testsuite>';

  const strXml2: string =
'<?xml version="1.0" encoding="utf-8"?>\
<testsuite tests="2" failures="0" name="com.microsoft.altframeworktraining.StartAppTest" time="72.079" errors="0" skipped="0">\
</testsuite>';

  const strXml3: string =
'<?xml version="1.0" encoding="utf-8"?>\
<testsuite tests="2" failures="0" name="com.microsoft.altframeworktraining.StartAppTest" time="72.079" errors="0" skipped="0">\
  <testsuite tests="2" failures="0" name="com.microsoft.altframeworktraining.StartAppTest" time="72.079" errors="0" skipped="0">\
  </testsuite>\
</testsuite>';

  const strXml5: string =
'<?xml version="1.0" encoding="utf-8"?>\
<testsuite tests="2" failures="0" name="com.microsoft.altframeworktraining.AdditionalAppTest" time="72.079" errors="0" skipped="1">\
  <testcase classname="com.microsoft.altframeworktraining.AdditionalAppTest" name="canStartAppInTest" time="47.273">\
    <skipped/>\
  </testcase>\
  <testcase classname="com.microsoft.altframeworktraining.AdditionalAppTest" name="canStartAppInTest2" time="24.806"/>\
</testsuite>';

  const xmlUtil: JUnitXmlUtil = new JUnitXmlUtil();

  it("should collect all elements", () => {
    const xml: Document = new DOMParser().parseFromString(strXml);
    const testCases: Element[] = xmlUtil.collectAllElements(xml.documentElement, "testcase");
    const testSuites: Element[] = xmlUtil.collectAllElements(xml.documentElement, "testsuite");

    expect(testCases.length).to.eql(2);
    expect(testSuites.length).to.eql(1);
  });

  it("should not throw an exception for a non-existent node", () => {
    const xml: Document = new DOMParser().parseFromString(strXml);
    const testCases: Element[] = xmlUtil.collectAllElements(xml.documentElement, "non-existent-test-case");

    expect(testCases.length).to.eql(0);
  });

  it("should append postfix", () => {
    const xml: Document = new DOMParser().parseFromString(strXml);
    xmlUtil.appendToTestNameTransformation(xml, "_new_test_case_postfix");
    const testCases: Element[] = xmlUtil.collectAllElements(xml.documentElement, "testcase");

    expect(testCases[0].attributes.getNamedItem("name").value)
      .to.eql("canStartAppInTest_new_test_case_postfix");
    expect(testCases[1].attributes.getNamedItem("name").value)
      .to.eql("canStartAppInTest2_new_test_case_postfix");
  });

  it("should not throw an exception while appending postfix to a non-existent node", () => {
    const xml: Document = new DOMParser().parseFromString(strXml2);
    xmlUtil.appendToTestNameTransformation(xml, "_new_test_case_postfix");
    const testCases: Element[] = xmlUtil.collectAllElements(xml.documentElement, "testcase");

    expect(testCases.length).to.eql(0);
  });

  it("should remove ignored transformation", () => {

    // If
    const xml: Document = new DOMParser().parseFromString(strXml5);

    // When
    xmlUtil.removeIgnoredTransformation(xml);

    // Then
    const testCases: Element[] = xmlUtil.collectAllElements(xml.documentElement, "testcase");
    const testResults: Element = xmlUtil.collectAllElements(xml.documentElement, "testsuite")[0];
    const skippedAttr: Attr = testResults.attributes.getNamedItem("skipped");
    const testsAttr: Attr = testResults.attributes.getNamedItem("tests");
    const timeAttr: Attr = testResults.attributes.getNamedItem("time");

    expect(testCases.length).to.eql(1);
    expect(skippedAttr.value).to.eql("0");
    expect(testsAttr.value).to.eql("1");
    expect(timeAttr.value).to.eql("24.806");
  });

  it("should collect only first level children", () => {
    const xml: Document = new DOMParser().parseFromString(strXml3);
    const testSuites: Element[] = xmlUtil.collectChildren(xml.documentElement, "testsuite");

    expect(testSuites.length).to.eql(1);
  });

  it("should count all children", () => {
   const xml: Document = new DOMParser().parseFromString(strXml);
   const testResults: Element = xmlUtil.collectChildren(xml.documentElement, "testsuite")[0];

   expect(xmlUtil.countChildren(testResults)).to.eql(2);
  });

  it("should not throw an exception if get null values", () => {
    let result: Node[] = xmlUtil.collectAllElements(null, "");
    expect(result.length).to.eql(0);

    result = xmlUtil.collectAllElements({} as Element, null);
    expect(result.length).to.eql(0);

    result = xmlUtil.collectChildren(null, "");
    expect(result.length).to.eql(0);

    result = xmlUtil.collectChildren({} as Element, null);
    expect(result.length).to.eql(0);

    expect(xmlUtil.countChildren(null)).to.eql(0);
  });

  it("should combine xmls correctly", async () => {

    // If
    const pathToArchive: string = path.join(__dirname, "../resources/junit_xml_zip.zip");

    // When
    const xml: Document = await xmlUtil.mergeXmlResults(pathToArchive);

    // Then
    const finalStrXml: string = new XMLSerializer().serializeToString(xml);
    const testSuites: Element[] = xmlUtil.collectAllElements(xml.documentElement, "testsuite");
    const testCases: Element[] = xmlUtil.collectAllElements(xml.documentElement, "testcase");
    const testSuitesNode: Element = xmlUtil.collectAllElements(xml.documentElement, "testsuites")[0];

    expect(testSuites.length).to.eql(2);

    const firstTestSuite: Element = testSuites[0];

    expect(testSuites.length).to.eql(2);
    expect(testCases.length).to.eql(10);

    let testsAttr: Attr = firstTestSuite.attributes.getNamedItem("tests");
    let failuresAttr: Attr = firstTestSuite.attributes.getNamedItem("failures");
    let timeAttr: Attr = firstTestSuite.attributes.getNamedItem("time");
    let errorsAttr: Attr = firstTestSuite.attributes.getNamedItem("errors");
    let skippedAttr: Attr = firstTestSuite.attributes.getNamedItem("skipped");

    expect(testsAttr.value).to.eql("6");
    expect(failuresAttr.value).to.eql("0");
    expect(timeAttr.value).to.equal("3.625");
    expect(errorsAttr.value).to.equal("2");
    expect(skippedAttr.value).to.equal("0");

    testsAttr = testSuitesNode.attributes.getNamedItem("tests");
    failuresAttr = testSuitesNode.attributes.getNamedItem("failures");
    timeAttr = testSuitesNode.attributes.getNamedItem("time");
    errorsAttr = testSuitesNode.attributes.getNamedItem("errors");
    skippedAttr = testSuitesNode.attributes.getNamedItem("skipped");

    expect(testsAttr.value).to.eql("10");
    expect(failuresAttr.value).to.eql("0");
    expect(timeAttr.value).to.equal("109.012");
    expect(errorsAttr.value).to.equal("2");
    expect(skippedAttr.value).to.equal("0");

    // Doesn't throw exception
    parser.parse(finalStrXml);
  });

  it("should throw an explicit exception", async () => {
    let exception = false;
    // If
    const pathToArchive: string = path.join(__dirname, "../resources/broken/junit_xml_zip.zip");

    // When
    try {
      await xmlUtil.mergeXmlResults(pathToArchive);
    } catch (e) {
      exception = true;
    }

    // Exception was thrown
    expect(exception).to.eql(true);
  });

  it("should create correct empty xml", () => {
    const xml: Document = xmlUtil.getEmptyXmlDocument();
    const testSuitesNode: Element = xmlUtil.collectAllElements(xml.documentElement, "testsuites")[0];

    const testsAttr: Attr = testSuitesNode.attributes.getNamedItem("tests");
    const failuresAttr: Attr = testSuitesNode.attributes.getNamedItem("failures");
    const timeAttr: Attr = testSuitesNode.attributes.getNamedItem("time");
    const errorsAttr: Attr = testSuitesNode.attributes.getNamedItem("errors");
    const skippedAttr: Attr = testSuitesNode.attributes.getNamedItem("skipped");

    expect(testsAttr.value).to.eql("0");
    expect(failuresAttr.value).to.eql("0");
    expect(timeAttr.value).to.equal("0");
    expect(errorsAttr.value).to.equal("0");
    expect(skippedAttr.value).to.equal("0");
  });
});
