import { MobileCenterSdkModule } from "../mobilecenter-sdk-module";

export default function injectSdkBuildGradle(code: string, sdkVersion: string, sdkModules: MobileCenterSdkModule): string {
  let lines: string[] = [];
  if (sdkModules) {
    lines.push("dependencies {");
    lines.push(`    def mobileCenterSdkVersion = '${sdkVersion}'`);
    if (sdkModules & MobileCenterSdkModule.Analytics)
      lines.push('    compile "com.microsoft.azure.mobile:mobile-center-analytics:${mobileCenterSdkVersion}"');
    if (sdkModules & MobileCenterSdkModule.Crashes)
      lines.push('    compile "com.microsoft.azure.mobile:mobile-center-crashes:${mobileCenterSdkVersion}"');
    if (sdkModules & MobileCenterSdkModule.Distribute)
      lines.push('    compile "com.microsoft.azure.mobile:mobile-center-distribute:${mobileCenterSdkVersion}"');
    lines.push("}");
  }
  let result: string = code.trim() + "\r\n";
  lines.forEach(x => result += "\r\n" + x);
  return result;
}