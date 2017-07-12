import { downloadString } from "../../util/misc/promisfied-https";
import { execAll } from "../../util/misc/helpers";
import * as _ from "lodash";

export async function getSdkVersions(platform: string): Promise<string[]> {
  const repository = getRepositoryForPlatform(platform);
  const versions = await getReleasesVersions(repository);
  return versions;
}

export async function getLatestSdkVersion(platform: string): Promise<string> {
  const repository = getRepositoryForPlatform(platform);
  const versions = await getReleasesVersions(repository, true);
  return _.last(versions);
}

function getRepositoryForPlatform(platform: string) {
  switch (platform) {
    case "java": return "mobile-center-sdk-android";
    case "objective-c-swift": return "mobile-center-sdk-ios";
    case "react-native": return "mobile-center-sdk-react-native";
    case "xamarin": return "mobile-center-sdk-dotnet";
  }
}

async function getReleasesVersions(repo: string, onlyFirstPage: boolean = false) {
  const releases: string[] = [];
  while (true) {
    const after = releases.length ? `?after=${_.last(releases)}` : "";
    const response = await downloadString(`https://github.com/Microsoft/${repo}/releases${after}`);
    const matches = execAll(/<h1 class="release-title">[\s\S]+?>(.+?)<\/a>/, response.result);
    if (!matches || !matches.length) {
      break;
    }

    matches.forEach(x => releases.push(x[1]));

    if (onlyFirstPage) {
      break;
    }
  }

  return releases.map(x => x.replace(/[^0-9.]/g, "")).reverse();
}