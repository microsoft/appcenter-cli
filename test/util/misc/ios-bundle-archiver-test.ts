import { expect } from "chai";

import * as process from "../../../src/util/misc/process-helper";

describe('ios bundle archiver', function () {
  
  it("ditto works with spaces",  async function (): Promise<void> {
    let error: (text: string) => void;
    let output: (text: string) => void;
    let exitCode = await process.execAndWait(`ditto "App With Space.app" "tmp"`, output, error);
    
    expect(exitCode).equals(1);
    expect(exitCode).is.not.equal(3);
  });
});