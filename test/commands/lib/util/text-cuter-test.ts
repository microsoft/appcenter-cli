import TextCutter from "../../../../src/commands/lib/util/text-cuter";
import { expect } from "chai";

describe("TextCutter", function () {

  const testText = "line0\nline1\nline2\nline3";

  it("should cut", function () {
    // Arrange
    const textCutter = new TextCutter(testText);

    // Act
    textCutter.goto(6).cut(5);

    // Assert
    expect(textCutter.result).to.equal("line0\n\nline2\nline3");
  });

  it("should cut & cut empty line", function () {
    // Arrange
    const textCutter = new TextCutter(testText);

    // Act
    textCutter.goto(6).cut(5).cutEmptyLine();

    // Assert
    expect(textCutter.result).to.equal("line0\nline2\nline3");
  });

  it("should cut line", function () {
    // Arrange
    const textCutter = new TextCutter(testText);

    // Act
    textCutter.goto(6).cut(5).cutLine();

    // Assert
    expect(textCutter.result).to.equal("line0\nline2\nline3");
  });

  it("should cut line if", function () {
    // Arrange
    const textCutter = new TextCutter(testText);

    // Act
    textCutter.goto(6).cutLineIf(l => l === "line1");

    // Assert
    expect(textCutter.result).to.equal("line0\nline2\nline3");
  });

  it("should cut two lines", function () {
    // Arrange
    const textCutter = new TextCutter(testText);

    // Act
    textCutter.goto(6).cut(5).cutEmptyLine();
    textCutter.goto(12).cut(5).cutEmptyLine();
    
    // Assert
    expect(textCutter.result).to.equal("line0\nline3");
  });

  it("text starts with new line", function () {
    // Arrange
    const textCutter = new TextCutter("\n" + testText);

    // Act
    textCutter.goto(7).cut(5).cutEmptyLine();
    textCutter.goto(1).cut(5).cutEmptyLine();
    
    // Assert
    expect(textCutter.result).to.equal("\nline2\nline3");
  });
});