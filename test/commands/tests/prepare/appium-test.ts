import { CommandArgs } from "../../../../src/util/commandLine";
import { expect } from "chai";
import PrepareAppiumCommand from "../../../../src/commands/tests/prepare/appium";
import * as sinon from "sinon";
import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

describe("Preparing Appium workspace", () => {
  let statStub: sinon.SinonStub;
  let writeStub: sinon.SinonStub;
  let readdirStub: sinon.SinonStub;
  let command: PrepareAppiumCommand;

  function mockPath(filePath: string, exists: boolean, isFile: boolean) {
    let platformPath = filePath.replace(new RegExp("/", "g"), path.sep);
    
    if (exists) {
      statStub.withArgs(platformPath).returns({ isFile: function() { return isFile }});
    }
    else {
      statStub.withArgs(platformPath).throws(new Error("Not found"));
    }
  }

  function mockClassFile(dirPath: string, fileName: string) {
    let platformDirPath = dirPath.replace(new RegExp("/", "g"), path.sep);
    readdirStub.withArgs(platformDirPath).returns([fileName]);
    let filePath = path.join(dirPath, fileName);
    mockPath(filePath, true, true);
  }

  beforeEach(() => {
    statStub = sinon.stub(fs, "statSync");
    writeStub = sinon.stub(fs, "writeFileSync");
    readdirStub = sinon.stub(fs, "readdirSync");

    let commandArgs = {
      command: ["tests", "prepare", "appium"],
      commandPath: "./",
      args: ["--workspace-path", "workspace"]
    };

    command = new PrepareAppiumCommand(commandArgs);
  });

  afterEach(() => {
    statStub.restore();
    writeStub.restore();
    readdirStub.restore();
  });

  it("should fail when there is no POM file", async () => {
    mockPath("workspace", true, false);
    mockPath("workspace/pom.xml", false, false);
    mockPath("workspace/dependency-jars", true, false);
    mockPath("workspace/test-classes", true, false);
    mockClassFile("workspace/test-classes", "test.class");

    let result = await command.runNoClient();
    expect(result.succeeded).to.be.false;
  });

  it("should fail when there is no dependency-jars directory", async () => {
    mockPath("workspace", true, false);
    mockPath("workspace/pom.xml", true, true);
    mockPath("workspace/dependency-jars", false, false);
    mockPath("workspace/test-classes", true, false);
    mockClassFile("workspace/test-classes", "test.class");

    let result = await command.runNoClient();
    expect(result.succeeded).to.be.false;
  });

  it("should fail when there is no test-classes directory", async () => {
    mockPath("workspace", true, false);
    mockPath("workspace/pom.xml", true, true);
    mockPath("workspace/dependency-jars", true, false);
    mockPath("workspace/test-classes", false, false);
    mockClassFile("workspace/test-classes", "test.class");

    let result = await command.runNoClient();
    expect(result.succeeded).to.be.false;
  });

  it("should fail when there is no *.class file inside test-classes directory", async () => {
    mockPath("workspace", true, false);
    mockPath("workspace/pom.xml", true, true);
    mockPath("workspace/dependency-jars", true, false);
    mockPath("workspace/test-classes", true, false);

    let result = await command.runNoClient();
    expect(result.succeeded).to.be.false;
  });

  it("should create valid manifest file when workspace is correct", async () => {
    mockPath("workspace", true, false);
    mockPath("workspace/pom.xml", true, true);
    mockPath("workspace/dependency-jars", true, false);
    mockPath("workspace/test-classes", true, false);
    mockClassFile("workspace/test-classes", "test.class");

    let result = await command.runNoClient();
    expect(result.succeeded).to.be.true;
  });
});