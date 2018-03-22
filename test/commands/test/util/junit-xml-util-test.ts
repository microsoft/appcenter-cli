import { expect } from "chai";
import { DOMParser, XMLSerializer } from "xmldom";
import { JUnitXmlUtil } from "../../../../src/commands/test/util/junit-xml-util";
var fastXmlParser = require('fast-xml-parser');

describe("junit xml util", function() {
  let strXml =
'<?xml version="1.0" encoding="utf-8"?>\
<testsuite tests="2" failures="1" name="com.microsoft.altframeworktraining.StartAppTest" time="56.187" errors="8" skipped="1">\
<testcase classname="com.microsoft.altframeworktraining.StartAppTest" name="canStartAppInTest" time="33.5"/>\
<testcase classname="com.microsoft.altframeworktraining.StartAppTest" name="canStartAppInTest2" time="22.687"/>\
</testsuite>';

  let strXml1 =
'<?xml version="1.0" encoding="utf-8"?>\
<testsuite tests="2" failures="0" name="com.microsoft.altframeworktraining.StartAppTest" time="72.079" errors="7" skipped="4">\
  <testcase classname="com.microsoft.altframeworktraining.StartAppTest" name="canStartAppInTest" time="47.273"/>\
  <testcase classname="com.microsoft.altframeworktraining.StartAppTest" name="canStartAppInTest2" time="24.806"/>\
</testsuite>';

  let strXml2 =
'<?xml version="1.0" encoding="utf-8"?>\
<testsuite tests="2" failures="0" name="com.microsoft.altframeworktraining.StartAppTest" time="72.079" errors="0" skipped="0">\
</testsuite>';

  let strXml3 =
'<?xml version="1.0" encoding="utf-8"?>\
<testsuite tests="2" failures="0" name="com.microsoft.altframeworktraining.StartAppTest" time="72.079" errors="0" skipped="0">\
  <testsuite tests="2" failures="0" name="com.microsoft.altframeworktraining.StartAppTest" time="72.079" errors="0" skipped="0">\
  </testsuite>\
</testsuite>';

  let strXml4 =
'<?xml version="1.0" encoding="utf-8"?>\
<testsuite tests="2" failures="0" name="com.microsoft.altframeworktraining.AdditionalAppTest" time="72.079" errors="0" skipped="2">\
  <testcase classname="com.microsoft.altframeworktraining.AdditionalAppTest" name="canStartAppInTest" time="47.273"/>\
  <testcase classname="com.microsoft.altframeworktraining.AdditionalAppTest" name="canStartAppInTest2" time="24.806"/>\
</testsuite>';

  let strXml5 =
'<?xml version="1.0" encoding="utf-8"?>\
<testsuite tests="2" failures="0" name="com.microsoft.altframeworktraining.AdditionalAppTest" time="72.079" errors="0" skipped="1">\
  <testcase classname="com.microsoft.altframeworktraining.AdditionalAppTest" name="canStartAppInTest" time="47.273">\
    <skipped/>\
  </testcase>\
  <testcase classname="com.microsoft.altframeworktraining.AdditionalAppTest" name="canStartAppInTest2" time="24.806"/>\
</testsuite>';

  let strXml6 =
'<?xml version="1.0" encoding="utf-8"?>\
<testsuite tests="0" failures="0" name="com.microsoft.altframeworktraining.EmptyTestSuite" time="0" errors="0" skipped="0">\
</testsuite>';

  let xmlUtil: JUnitXmlUtil = new JUnitXmlUtil();

  it("should collect all elements", () => {
    let xml: Document = new DOMParser().parseFromString(strXml);
    let testCases: Node[] = xmlUtil.collectAllElements(xml,"testcase");
    let testSuites: Node[] = xmlUtil.collectAllElements(xml,"testsuite");

    expect(testCases.length).to.eql(2);
    expect(testSuites.length).to.eql(1);
  });

  it("should not throw an exception for a non-existent node", () => {
    let xml: Document = new DOMParser().parseFromString(strXml);
    let testCases: Node[] = xmlUtil.collectAllElements(xml, "non-existent-test-case");

    expect(testCases.length).to.eql(0);
  });

  it("should append postfix", () => {
    let xml: Document = new DOMParser().parseFromString(strXml);
    xmlUtil.appendToTestNameTransformation(xml, "_new_test_case_postfix");
    let testCases: Node[] = xmlUtil.collectAllElements(xml,"testcase");

    expect(testCases[0].attributes.getNamedItem("name").value)
      .to.eql("canStartAppInTest_new_test_case_postfix");
    expect(testCases[1].attributes.getNamedItem("name").value)
      .to.eql("canStartAppInTest2_new_test_case_postfix");
  });

  it("should not throw an exception while appending postfix to a non-existent node", () => {
    let xml: Document = new DOMParser().parseFromString(strXml2);
    xmlUtil.appendToTestNameTransformation(xml, "_new_test_case_postfix");
    let testCases: Node[] = xmlUtil.collectAllElements(xml, "testcase");

    expect(testCases.length).to.eql(0);
  });

  it("should remove ignored transformation", () => {

    // If
    let xml: Document = new DOMParser().parseFromString(strXml5);

    // When
    xmlUtil.removeIgnoredTransformation(xml);

    // Then
    let testCases: Node[] = xmlUtil.collectAllElements(xml, "testcase");
    let testResults: Node = xmlUtil.collectAllElements(xml, "testsuite")[0];
    let skippedAttr: Attr = testResults.attributes.getNamedItem("skipped");
    let testsAttr: Attr = testResults.attributes.getNamedItem("tests");
    let timeAttr: Attr = testResults.attributes.getNamedItem("time");

    expect(testCases.length).to.eql(1);
    expect(skippedAttr.value).to.eql("0");
    expect(testsAttr.value).to.eql("1")
    expect(timeAttr.value).to.eql("24.806");
  });

  it("should collect only first level children", () => {
    let xml: Document = new DOMParser().parseFromString(strXml3);
    let testSuites: Node[] = xmlUtil.collectChildren(xml, "testsuite");

    expect(testSuites.length).to.eql(1);
  });

  it("should count all children", () => {
   let xml: Document = new DOMParser().parseFromString(strXml);
   let testResults: Node = xmlUtil.collectChildren(xml, "testsuite")[0];

   expect(xmlUtil.countChildren(testResults)).to.eql(2);
  });

  it("should not throw an exception if get null values", () => {
    let result: Node[] = xmlUtil.collectAllElements(null, "");
    expect(result.length).to.eql(0);

    result = xmlUtil.collectAllElements({} as Node, null);
    expect(result.length).to.eql(0);

    result = xmlUtil.collectChildren(null, "");
    expect(result.length).to.eql(0);

    result = xmlUtil.collectChildren({} as Node, null);
    expect(result.length).to.eql(0);

    expect(xmlUtil.countChildren(null)).to.eql(0);
  });

  it("should combine xmls correctly", () => {

    // If
    let xml: Document = xmlUtil.getEmptyXmlDocument();
    let xml1: Document = new DOMParser().parseFromString(strXml);
    let xml2: Document = new DOMParser().parseFromString(strXml1);
    let xml3: Document = new DOMParser().parseFromString(strXml4);
    let xml4: Document = new DOMParser().parseFromString(strXml6);

    // When
    xml = xmlUtil.combine(xml, xml1);
    xml = xmlUtil.combine(xml, xml2);
    xml = xmlUtil.combine(xml, xml3);
    xml = xmlUtil.combine(xml, xml4);

    // Then
    var finalStrXml = new XMLSerializer().serializeToString(xml);
    let testSuites: Node[] = xmlUtil.collectAllElements(xml, "testsuite");
    let testSuitesNode: Node = xmlUtil.collectAllElements(xml, "testsuites")[0];

    expect(testSuites.length).to.eql(2);

    let startAppTestSuite: Node = testSuites[0];

    expect(xmlUtil.collectAllElements(startAppTestSuite, "testcase").length).to.eql(4);

    let testsAttr: Attr = startAppTestSuite.attributes.getNamedItem("tests");
    let failuresAttr: Attr = startAppTestSuite.attributes.getNamedItem("failures");
    let timeAttr: Attr = startAppTestSuite.attributes.getNamedItem("time");
    let errorsAttr: Attr = startAppTestSuite.attributes.getNamedItem("errors");
    let skippedAttr: Attr = startAppTestSuite.attributes.getNamedItem("skipped");

    expect(testsAttr.value).to.eql("4");
    expect(failuresAttr.value).to.eql("1");
    expect(timeAttr.value).to.equal("128.266");
    expect(errorsAttr.value).to.equal("15");
    expect(skippedAttr.value).to.equal("5");

    testsAttr = testSuitesNode.attributes.getNamedItem("tests");
    failuresAttr = testSuitesNode.attributes.getNamedItem("failures");
    timeAttr = testSuitesNode.attributes.getNamedItem("time");
    errorsAttr = testSuitesNode.attributes.getNamedItem("errors");
    skippedAttr = testSuitesNode.attributes.getNamedItem("skipped");

    expect(testsAttr.value).to.eql("6");
    expect(failuresAttr.value).to.eql("1");
    expect(timeAttr.value).to.equal("200.345");
    expect(errorsAttr.value).to.equal("15");
    expect(skippedAttr.value).to.equal("7");

    expect(fastXmlParser.validate(finalStrXml)).to.eql(true);
  });

  it("should create correct empty xml", () => {
    let xml: Document = xmlUtil.getEmptyXmlDocument();
    let testSuitesNode: Node = xmlUtil.collectAllElements(xml, "testsuites")[0];

    let testsAttr: Attr = testSuitesNode.attributes.getNamedItem("tests");
    let failuresAttr: Attr = testSuitesNode.attributes.getNamedItem("failures");
    let timeAttr: Attr = testSuitesNode.attributes.getNamedItem("time");
    let errorsAttr: Attr = testSuitesNode.attributes.getNamedItem("errors");
    let skippedAttr: Attr = testSuitesNode.attributes.getNamedItem("skipped");

    expect(testsAttr.value).to.eql("0");
    expect(failuresAttr.value).to.eql("0");
    expect(timeAttr.value).to.equal("0");
    expect(errorsAttr.value).to.equal("0");
    expect(skippedAttr.value).to.equal("0");
  });
});
