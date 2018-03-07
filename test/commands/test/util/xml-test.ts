import { expect } from "chai";
import { DOMParser } from "xmldom";
import * as xmlUtil from "../../../../src/commands/test/util/xml";

describe("xml util", function() {
  let strXml =
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

  let strXml1 =
'<?xml version="1.0" encoding="utf-8"?>\
<test-results ignored="1" not-run="1">\
<test-suite>\
  <test-suite>\
  </test-suite>\
</test-suite>\
<test-suite>\
</test-suite>\
</test-results>';

  it("should collect all elements", () => {
    let xml: Document = new DOMParser().parseFromString(strXml);
    let testCases: Node[] = xmlUtil.collectAllElements(xml,"test-case");
    let testSuites: Node[] = xmlUtil.collectAllElements(xml,"test-suite");

    expect(testCases.length).to.eql(2);
    expect(testSuites.length).to.eql(2);

    xml = new DOMParser().parseFromString(strXml1);
    testSuites = xmlUtil.collectAllElements(xml, "test-suite");

    expect(testSuites.length).to.eql(3);
  });

  it("it should not throw an exception for a non-existent node", () => {
    let xml: Document = new DOMParser().parseFromString(strXml);
    let testCases: Node[] = xmlUtil.collectAllElements(xml,"non-existent-test-case");

    expect(testCases.length).to.eql(0);
  });

  it("should append postfix", () => {
    let xml: Document = new DOMParser().parseFromString(strXml);
    xmlUtil.appendToTestNameTransformation(xml, "_new_test_case_postfix");
    let testCases: Node[] = xmlUtil.collectAllElements(xml,"test-case");

    expect(testCases[0].attributes.getNamedItem("name").value)
      .to.eql("CreditCardValidator.Droid.UITests.Tests.Test0_new_test_case_postfix");
    expect(testCases[1].attributes.getNamedItem("name").value)
      .to.eql("CreditCardValidator.Droid.UITests.Tests.Test1_new_test_case_postfix");
  });

  it("should not throw an exception while appending postfix to a non-existent node", () => {
    let xml: Document = new DOMParser().parseFromString(strXml1);
    xmlUtil.appendToTestNameTransformation(xml, "_new_test_case_postfix");
    let testCases: Node[] = xmlUtil.collectAllElements(xml,"test-case");

    expect(testCases.length).to.eql(0);
  });

  it("should remove ignored transformation", () => {
    let xml: Document = new DOMParser().parseFromString(strXml);
    xmlUtil.removeIgnoredTransformation(xml);
    let testCases: Node[] = xmlUtil.collectAllElements(xml,"test-case");
    let testResults: Node = xmlUtil.collectAllElements(xml, "test-results")[0];
    let ignoredAttr: Attr = testResults.attributes.getNamedItem("ignored");
    let notRunAttr: Attr = testResults.attributes.getNamedItem("not-run");

    expect(testCases.length).to.eql(1);
    expect(ignoredAttr.value).to.eql("0");
    expect(notRunAttr.value).to.eql("0")
  });

  it("should remove empty suites", () => {
    let xml: Document = new DOMParser().parseFromString(strXml);
    let testSuites: Node[] = xmlUtil.collectAllElements(xml, "test-suite");

    expect(testSuites.length).to.eql(2);

    xmlUtil.removeEmptySuitesTransformation(xml);
    testSuites = xmlUtil.collectAllElements(xml, "test-suite");

    expect(testSuites.length).to.eql(1);
  });

  it("should collect only first level children", () => {
    let xml: Document = new DOMParser().parseFromString(strXml1);
    let testSuites: Node[] = xmlUtil.collectChildren(xml, "test-suite");

    expect(testSuites.length).to.eql(2);
  });

  it("should count all children", () => {
   let xml: Document = new DOMParser().parseFromString(strXml);
   let testResults: Node = xmlUtil.collectChildren(xml, "test-results")[0];

   expect(xmlUtil.countChildren(testResults)).to.eql(8);
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
});
