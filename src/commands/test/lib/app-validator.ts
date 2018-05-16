import * as path from "path";

export class AppValidator {
  private appPath: string;

  public static async validate(appPath: string) {
    const validator = new AppValidator(appPath);
    await validator.validate();
  }

  constructor(appPath: string) {
    if (!appPath) {
      throw new Error("Argument appPath is required");
    }
    this.appPath = appPath;
  }

  public async validate() {
    if (!(this.isIosApp() || this.isAndroidApp())) {
      throw new Error("The application file must be either Android or iOS application");
    }
  }

  public isIosApp(): boolean {
    return path.extname(this.appPath) === ".ipa";
  }

  public isAndroidApp(): boolean {
    return path.extname(this.appPath) === ".apk";
  }
}
