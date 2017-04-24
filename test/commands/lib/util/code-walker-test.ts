import { CodeBag, CodeWalker } from "../../../../src/commands/lib/util/code-walker";

import { expect } from "chai";

describe("CodeWalker", function () {
  const code =
    "// Single-line comment\n" +
    "/*\n" +
    " Multi-line comment\n" +
    " */\n" +
    "class TestClass {\n" +
    "    void TestMethod1() {\n" +
    "        String s = \"Text in quotes\";\n" +
    "    }\n" +
    "    void TestMethod2() {\n" +
    "        int i = 42;\n" +
    "    }\n" +
    "}";

  it("should track block level and skip comments & quotes", function () {
    // Arrange
    const bag = new TestBag();
    const walker = new CodeWalker(code, bag);
    walker.addTrap(
      b => walker.forepart.startsWith("TestClass"),
      b => {
        b.classesCount++;
        expect(b.blockLevel, "TestClass block level").to.equal(0);
      }
    );
    walker.addTrap(
      b => walker.forepart.startsWith("TestMethod"),
      b => {
        b.methodsCount++;
        expect(b.blockLevel, "TestMethod block level").to.equal(1);
      }
    );
    walker.addTrap(
      b => walker.forepart.startsWith("i =") 
        || walker.forepart.startsWith("s ="),
      b => {
        expect(b.blockLevel, "Within methods block level").to.equal(2);
      }
    );
    walker.addTrap(
      b => walker.forepart.startsWith("Single-line comment"),
      b => {
        throw new Error("Should never be within single-line comments.");
      }
    );
    walker.addTrap(
      b => walker.forepart.startsWith("Multi-line comment"),
      b => {
        throw new Error("Should never be within multi-line comments.");
      }
    );
    walker.addTrap(
      b => walker.forepart.startsWith("Text in quotes"),
      b => {
        throw new Error("Should never be within quotes.");
      }
    );

    // Act
    walker.walk();

    // Assert
    expect(bag.classesCount).to.equal(1);
    expect(bag.methodsCount).to.equal(2);
  });
});

class TestBag extends CodeBag {
  classesCount: number = 0;
  methodsCount: number = 0;
}