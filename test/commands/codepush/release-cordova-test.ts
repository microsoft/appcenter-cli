describe("Codepush release-cordova command", function () {
  it("pass when all arguments provided", function () {});
  it("returns graceful error when deployment doesn't exists", function () {});
  context("allowed OSes", function () {
    ["iOS", "Android"].forEach((os) => it(`only iOS and Android allowed, check ${os}`, function () {}));
  });
  it("fails the command if non cordova platform is returned for the app", function () {});
  it("reads the binary version from config.xml if not provided for the command", function () {});
  it("fails the command when semver incompatible binary version specified", function () {});
  context("cli Command", function () {
    context("command args", function () {
      it('defaults to "prepare"', function () {});
      context("when --build specified", function () {
        it('returns "build --release" for release build type', function () {});
        it('return "build" otherwise', function () {});
      });
    });
    context("executable", function () {
      it("tries to use cordova first", function () {});
      it("tries to use phonegap if no cordova found", function () {});
      it("fails the command if both cordova and phonegap are not installed", function () {});
    });
  });
  context("cordova output folder", function () {
    it("returns correct for iOS", function () {});
    it("returns cordova 7 compatible path for Android", function () {});
    it("returns pre cordova 7 path for Android (if no newer found)", function () {});
  });
});
