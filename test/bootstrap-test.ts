// Typescript test to verify that mocha/chai actually works
import { expect } from "chai";

describe("bootstrap", function () {
    it("should run this", () => {
        expect(true).to.be.true;
    });

    it("should fail this", () => {
        expect(1).to.equal(2);
    });
});
