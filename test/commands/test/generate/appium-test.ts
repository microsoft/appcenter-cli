import { expect } from "chai";
import * as path from "path";
import * as pfs from "../../../../src/util/misc/promisfied-fs";
import { CommandArgs } from "../../../../src/util/commandline";
import GenerateAppiumCommand from "../../../../src/commands/test/generate/appium";

describe("Validating Appium template generation", () => {
  const tempTemplateDir: string = "../resources/appium-template-files-tmp";

  beforeEach(async () => {
    await pfs.mkdirp(path.join(__dirname, tempTemplateDir));
  });

  afterEach(async () => {
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
