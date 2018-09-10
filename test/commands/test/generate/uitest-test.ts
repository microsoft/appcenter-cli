import { expect } from "chai";
import * as Sinon from "sinon";
import * as path from "path";
import * as pfs from "../../../../src/util/misc/promisfied-fs";
import { CommandArgs } from "../../../../src/util/commandline";
import GenerateUITestCommand from "../../../../src/commands/test/generate/uitest";

describe("Validating UITest template generation", () => {
  let sandbox: Sinon.SinonSandbox = null;
  const templateDir: string = "../../../../src/commands/test/lib/templates/uitest/android";
  const tempTemplateDir: string = "../resources/uitest-template-files-tmp";

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
      command: ["test", "generate", "uitest"],
      commandPath: "Test",
      args: ["--platform", "Android", "--output-path", path.join(__dirname, `${tempTemplateDir}/test`)]
    };

    const command = new GenerateUITestCommand(args);

    // Act
    await command.execute();

    // Assert
    expect(await pfs.exists(path.join(command.outputPath, `AppCenter.UITest.${command.platform}`))).to.be.true;
    expect(await pfs.exists(path.join(command.outputPath, `AppCenter.UITest.${command.platform}.sln`))).to.be.true;
    expect(await pfs.exists(path.join(command.outputPath, `AppCenter.UITest.${command.platform}/AppCenter.UITest.${command.platform}.csproj`))).to.be.true;
    expect(await pfs.exists(path.join(command.outputPath, `AppCenter.UITest.${command.platform}/Tests.cs`))).to.be.true;
    expect(await pfs.exists(path.join(command.outputPath, `AppCenter.UITest.${command.platform}/packages.config`))).to.be.true;
    expect(await pfs.exists(path.join(command.outputPath, `AppCenter.UITest.${command.platform}/Properties/AssemblyInfo.cs`))).to.be.true;
  });

  it("should update NuGet version", async () => {
    // Arrange
    const fakeLatestVersion = "2.5.6";
    const args: CommandArgs = {
      command: ["test", "generate", "uitest"],
      commandPath: "Test",
      args: ["--platform", "Android", "--output-path", path.join(__dirname, tempTemplateDir)]
    };

    const command = new GenerateUITestCommand(args);
    sandbox.stub(command as any, "getLatestUITestVersionNumber").callsFake(() => {
      return new Promise<string>((resolve) => {
        resolve(fakeLatestVersion);
      });
    });

    const packageFilePath = path.join(command.outputPath, `AppCenter.UITest.${command.platform}/packages.config`);
    const projectFilePath = path.join(command.outputPath, `AppCenter.UITest.${command.platform}/AppCenter.UITest.${command.platform}.csproj`);

    // Assert
    let packageFileContent = await pfs.readFile(packageFilePath, "utf8");
    expect(packageFileContent).not.contain(fakeLatestVersion);

    let projectFileContent = await pfs.readFile(projectFilePath, "utf8");
    expect(projectFileContent).not.contain(fakeLatestVersion);

    // Act
    await (command as any).processTemplate();

    // Assert
    packageFileContent = await pfs.readFile(packageFilePath, "utf8");
    expect(packageFileContent).contain(fakeLatestVersion);

    projectFileContent = await pfs.readFile(projectFilePath, "utf8");
    expect(projectFileContent).contain(fakeLatestVersion);
  });
});
