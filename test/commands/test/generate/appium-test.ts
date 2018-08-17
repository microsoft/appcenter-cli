import { expect } from "chai";
import * as Sinon from "sinon";
import * as path from "path";
import * as pfs from "../../../../src/util/misc/promisfied-fs";
import { CommandArgs } from "../../../../src/util/commandline";
import GenerateAppiumCommand from "../../../../src/commands/test/generate/appium";

describe("Validating Appium template generation", () => {
  let sandbox: Sinon.SinonSandbox = null;
  const templateDir: string = "../../../../src/commands/test/generate/templates/appium/ios";
  const tempTemplateDir: string = "../resources/appium-template-files-tmp";

  beforeEach(async () => {
    sandbox = Sinon.createSandbox();
    await pfs.mkdirp(path.join(__dirname, tempTemplateDir));

    await pfs.cpDir(path.join(__dirname, templateDir),
                    path.join(__dirname, tempTemplateDir));
  });

  afterEach(async () => {
    sandbox.restore();
    await pfs.rmDir(path.join(__dirname, tempTemplateDir));
  });

  it("should create test template in folder", async () => {
    // Arrange
    const args: CommandArgs = {
      command: ["test", "generate", "appium"],
      commandPath: "Test",
      args: ["--platform", "iOS", "--output-path", path.join(__dirname, tempTemplateDir)]
    };

    const command = new GenerateAppiumCommand(args);

    // Act
    await command.execute();

    // Assert
    expect(await pfs.exists(path.join(command.outputPath, "src"))).to.be.true;
    expect(await pfs.exists(path.join(command.outputPath, "pom.xml"))).to.be.true;
    expect(await pfs.exists(path.join(command.outputPath, "src/test/java/com/azure/mobile/app/test/LaunchTest.java"))).to.be.true;
  });
});
