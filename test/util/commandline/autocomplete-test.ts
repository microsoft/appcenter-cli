import * as path from "path";
import * as fs from "fs";
import * as Sinon from "sinon";
import * as autocomplete from "../../../src/util/commandline/autocomplete";
import { expect } from "chai";

describe("autocomplete", () => {
  let sandbox: Sinon.SinonSandbox = null;
  const testProfilePath: string = path.join(__dirname, "test-data/test-bash-profile");

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    sandbox.stub(process, "exit");
  });

  it("should enable bash_completion and appcenter completion in init file for bash", () => {
    // Act
    autocomplete.setupAutoCompleteForShell(testProfilePath, "bash");

    // Assert
    const testProfileContent = fs.readFileSync(testProfilePath, { encoding: "utf-8" });

    expect(testProfileContent).contain("Test bash_profile data");
    expect(testProfileContent).contain("begin bash_completion");
    expect(testProfileContent).contain("begin appcenter completion");
  });

  it("should not enable bash_completion, but should enable appcenter completion in init file for zsh", () => {
    // Act
    autocomplete.setupAutoCompleteForShell(testProfilePath, "zsh");

    // Assert
    const testProfileContent = fs.readFileSync(testProfilePath, { encoding: "utf-8" });

    expect(testProfileContent).contain("Test bash_profile data");
    expect(testProfileContent).not.contain("begin bash_completion");
    expect(testProfileContent).contain("begin appcenter completion");
  });

  it("should not enable bash_completion and appcenter completion if autocomplete was enabled before", () => {
    // Arange
    fs.appendFileSync(testProfilePath, "begin appcenter completion");

    // Act
    autocomplete.setupAutoCompleteForShell(testProfilePath, "zsh");

    // Assert
    const testProfileContent = fs.readFileSync(testProfilePath, { encoding: "utf-8" });

    expect(testProfileContent).contain("Test bash_profile data");
    expect(testProfileContent).not.contain("end bash_completion");
    expect(testProfileContent).not.contain("end appcenter completion");
  });

  afterEach(() => {
    sandbox.restore();
    fs.writeFileSync(testProfilePath, "Test bash_profile data");
  });
});
