import TextWalker from "../../../../src/commands/lib/util/text-walker";
import { expect } from "chai";

describe("TextWalker", function () {

  const text = "0123456789ABCDEF";

  it("should walk", function () {
    // Arrange
    const bag = new TestBag();
    const walker = new TextWalker(text, bag);
    walker.addTrap(
      b => true,
      b => b.stepsCount++
    );
    walker.addTrap(
      b => b.stepsCount === 15,
      b => {
        expect(walker.prevChar).to.equal("D");
        expect(walker.currentChar).to.equal("E");
        expect(walker.nextChar).to.equal("F");
      }
    );
    walker.addTrap(
      b => walker.currentChar === "A",
      b => {
        expect(walker.position).to.equal(10);
        expect(walker.backpart).to.equal("0123456789");
        expect(walker.forepart).to.equal("ABCDEF");
      }
    );

    // Act
    walker.walk();

    // Assert
    expect(bag.stepsCount).to.equal(16);
  });

  it("should jump", function () {
    // Arrange
    const bag = new TestBag();
    const walker = new TextWalker(text, bag);
    walker.addTrap(
      b => true,
      b => b.stepsCount++
    );
    walker.addTrap(
      b => b.jumpHappened,
      b => {
        expect(walker.position).to.equal(10);
        b.jumpHappened = null;
      }
    );
    walker.addTrap(
      b => walker.currentChar === "3",
      b => {
        walker.jump(7);
        b.jumpHappened = true;
      }
    );
    walker.addTrap(
      b => walker.currentChar === "4",
      b => { throw new Error("Should never be here."); }
    );

    // Act
    walker.walk();

    // Assert
    expect(bag.stepsCount).to.equal(10);
    expect(bag.jumpHappened).to.be.null;
  });

  it("should stop", function () {
    // Arrange
    const bag = new TestBag();
    const walker = new TextWalker(text, bag);
    walker.addTrap(
      b => true,
      b => b.stepsCount++
    );
    walker.addTrap(
      b => walker.currentChar === "9",
      b => walker.stop()
    );
    walker.addTrap(
      b => walker.currentChar === "A",
      b => { throw new Error("Should never be here."); }
    );

    // Act
    walker.walk();

    // Assert
    expect(bag.stepsCount).to.equal(10);
  });
});

class TestBag {
  stepsCount: number = 0;
  jumpHappened: boolean = false;
}