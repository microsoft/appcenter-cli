import { AppiumPreparer } from "../../../../src/commands/test/lib/appium-preparer";
import * as chai from "chai";
import * as fsLayout from "../../../util/fs/fs-layout";
import * as path from "path";
import * as pfs from "../../../../src/util/misc/promisfied-fs";

const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = chai.expect;

function createValidBuildDirSpec(): fsLayout.IDirSpec {
  return {
    "pom.xml": '<?xml version="1.0" encoding="utf-8"><foo></foo>',
    "dependency-jars": { },
    "test-classes": {
      "test.classs": "Fake *.class file"
    }
  };
};

describe("Preparing Appium workspace", () => {
  let buildDir: string = null;
  let artifactsDir: string = null;

  afterEach(async () => {
    if (buildDir) {
      await pfs.rmDir(buildDir, true);
    }
    if (artifactsDir) {
      await pfs.rmDir(artifactsDir, true);
    }
  });

  beforeEach(async () => {
    artifactsDir = await pfs.mkTempDir("appium-tests");
  });

  it("should fail when there is no POM file", async () => {
    let spec = createValidBuildDirSpec();
    delete spec["pom.xml"];

    buildDir = await fsLayout.createLayout(spec);

    let preparer = new AppiumPreparer(artifactsDir, null, buildDir);
    await expect(preparer.prepare()).to.eventually.be.rejected;
  });

  it("should fail when there is no dependency-jars directory", async () => {
    let spec = createValidBuildDirSpec();
    delete spec["dependency-jars"];

    buildDir = await fsLayout.createLayout(spec);

    let preparer = new AppiumPreparer(artifactsDir, null, buildDir);
    await expect(preparer.prepare()).to.eventually.be.rejected;
  });

  it("should fail when there is no test-classes directory", async () => {
    let spec = createValidBuildDirSpec();
    delete spec["test-classes"];

    buildDir = await fsLayout.createLayout(spec);

    let preparer = new AppiumPreparer(artifactsDir, null, buildDir);
    await expect(preparer.prepare()).to.eventually.be.rejected;
  });

  it("should fail when there is no *.class file inside test-classes directory", async () => {
    let spec = createValidBuildDirSpec();
    spec["test-classes"] = { };

    buildDir = await fsLayout.createLayout(spec);

    let preparer = new AppiumPreparer(artifactsDir, null, buildDir);
    await expect(preparer.prepare()).to.eventually.be.rejected;
  });

  it("should create valid manifest file when workspace is correct", async () => {
    let spec = createValidBuildDirSpec();
    buildDir = await fsLayout.createLayout(spec);
    
    let preparer = new AppiumPreparer(artifactsDir, null, buildDir);
    let manifestPath = await preparer.prepare();

    expect(manifestPath).to.eql(path.join(artifactsDir, "test-manifest.json"));
  });
});