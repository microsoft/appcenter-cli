import { expect } from "chai";
import { DOMParser, XMLSerializer } from "xmldom";
import * as xmlLib from "libxmljs";
import { NUnitXmlUtil } from "../../../../src/commands/test/util/nunit-xml-util";

describe("nunit xml util", function() {
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

let fullStrXml1: string = '<?xml version="1.0" encoding="UTF-8"?>\
<test-results name="Xamarin Testcloud UITest" date="2018-03-22" time="15:27:53" total="2" errors="0" failures="0" not-run="15" inconclusive="0" ignored="15" skipped="0" invalid="0">\
   <test-suite type="Assembly" name="CreditCardValidator.Droid.UITests.dll" executed="True" result="Success" success="True" time="281.797" asserts="0">\
      <results>\
         <test-suite type="Namespace" name="CreditCardValidator" executed="True" result="Success" success="True" time="281.792" asserts="0">\
            <results>\
               <test-suite type="Namespace" name="Droid" executed="True" result="Success" success="True" time="281.792" asserts="0">\
                  <results>\
                     <test-suite type="Namespace" name="UITests" executed="True" result="Success" success="True" time="281.792" asserts="0">\
                        <results>\
                           <test-suite type="TestFixture" name="Tests2" executed="True" result="Success" success="True" time="26.572" asserts="0">\
                              <categories>\
                                 <category name="Test2" />\
                              </categories>\
                              <results>\
                                 <test-case name="CreditCardValidator.Droid.UITests.Tests2.Test2" executed="True" result="Success" success="True" time="14.128" asserts="0">\
                                    <reason>\
                                       <message><![CDATA[Test2]]></message>\
                                    </reason>\
                                 </test-case>\
                              </results>\
                           </test-suite>\
                        </results>\
                     </test-suite>\
                  </results>\
               </test-suite>\
            </results>\
         </test-suite>\
      </results>\
   </test-suite>\
</test-results>';

let fullStrXml2: string = '<?xml version="1.0" encoding="UTF-8"?>\
<test-results name="Xamarin Testcloud UITest" date="2018-03-22" time="15:26:14" total="2" errors="0" failures="0" not-run="15" inconclusive="0" ignored="15" skipped="0" invalid="0">\
   <test-suite type="Assembly" name="CreditCardValidator.Droid.UITests.dll" executed="True" result="Success" success="True" time="185.220" asserts="0">\
      <results>\
         <test-suite type="Namespace" name="CreditCardValidator" executed="True" result="Success" success="True" time="185.213" asserts="0">\
            <results>\
               <test-suite type="Namespace" name="Droid" executed="True" result="Success" success="True" time="185.213" asserts="0">\
                  <results>\
                     <test-suite type="Namespace" name="UITests" executed="True" result="Success" success="True" time="185.212" asserts="0">\
                        <results>\
                           <test-suite type="TestFixture" name="Tests2" executed="True" result="Success" success="True" time="21.561" asserts="0">\
                              <categories>\
                                 <category name="Test2" />\
                              </categories>\
                              <results>\
                                 <test-case name="CreditCardValidator.Droid.UITests.Tests2.Test2" executed="True" result="Success" success="True" time="15.481" asserts="0">\
                                    <reason>\
                                       <message><![CDATA[Test2]]></message>\
                                    </reason>\
                                 </test-case>\
                              </results>\
                           </test-suite>\
                        </results>\
                     </test-suite>\
                  </results>\
               </test-suite>\
            </results>\
         </test-suite>\
      </results>\
   </test-suite>\
</test-results>';

  let xmlUtil: NUnitXmlUtil = new NUnitXmlUtil();

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

  it("should not throw an exception for a non-existent node", () => {
    let xml: Document = new DOMParser().parseFromString(strXml);
    let testCases: Node[] = xmlUtil.collectAllElements(xml, "non-existent-test-case");

    expect(testCases.length).to.eql(0);
  });

  it("should append postfix", () => {
    let xml: Document = new DOMParser().parseFromString(strXml);
    xmlUtil.appendToTestNameTransformation(xml, "_new_test_case_postfix");
    let testCases: Node[] = xmlUtil.collectAllElements(xml, "test-case");

    expect(testCases[0].attributes.getNamedItem("name").value)
      .to.eql("CreditCardValidator.Droid.UITests.Tests.Test0_new_test_case_postfix");
    expect(testCases[1].attributes.getNamedItem("name").value)
      .to.eql("CreditCardValidator.Droid.UITests.Tests.Test1_new_test_case_postfix");
  });

  it("should not throw an exception while appending postfix to a non-existent node", () => {
    let xml: Document = new DOMParser().parseFromString(strXml1);
    xmlUtil.appendToTestNameTransformation(xml, "_new_test_case_postfix");
    let testCases: Node[] = xmlUtil.collectAllElements(xml, "test-case");

    expect(testCases.length).to.eql(0);
  });

  it("should remove ignored transformation", () => {
    let xml: Document = new DOMParser().parseFromString(strXml);
    xmlUtil.removeIgnoredTransformation(xml);
    let testCases: Node[] = xmlUtil.collectAllElements(xml, "test-case");
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

  it("should combine xmls correctly", () => {

    // If
    let xml1: Document = new DOMParser().parseFromString(fullStrXml1);
    let xml2: Document = new DOMParser().parseFromString(fullStrXml2);

    // When
    xml1 = xmlUtil.combine(xml1, xml2);

    // Then
    var finalStrXml = new XMLSerializer().serializeToString(xml1);

    // Doesn't throw exception
    xmlLib.parseXml(finalStrXml);
  });
});
