// Information storage and retrieval about the current user
//
// Right now we only support a single logged in user

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as mkdirp from "mkdirp";

import { environments } from "./environments";

export interface Profile {
  userId: string;
  userName: string;
  displayName: string;
  email: string;
  environment: string;
  accessTokenId: string;
  accessToken: string;
  endpoint: string;
}

let currentProfile: Profile = null;

function fileExists(filename: string): boolean {
  try {
    return fs.statSync(filename).isFile();
  }
  catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
  return false;
}

function getProfileDir(): string {
  let profileDir: string;
  if (os.platform() === "win32") {
    profileDir = process.env.AppData;
  } else {
    profileDir = os.homedir();
  }

  profileDir = path.join(profileDir, ".sonomacli");
  return profileDir;
}

function getProfileFilename(): string {
  const profileDir = getProfileDir();
  return path.join(profileDir, "profile.json");
}

function loadProfile(): Profile {
  const profilePath = getProfileFilename();
  if (!fileExists(profilePath)) {
    return null;
  }

  let profileContents = fs.readFileSync(profilePath, "utf8");
  return JSON.parse(profileContents) as Profile;
}

export function getUser(): Profile {
  if (!currentProfile) {
    currentProfile = loadProfile();
    if (currentProfile && !currentProfile.endpoint) {
      currentProfile.endpoint = environments(currentProfile.environment).endpoint;
    }
  }
  return currentProfile;
}

export function saveUser(user: any, token: any, environment: string): Profile {
  let profile = {
    userId: user.id,
    userName: user.name,
    displayName: user.display_name || user.displayName,
    environment,
    email: user.email,
    accessTokenId: token.id,
    accessToken: token.api_token || token.apiToken,
    endpoint: environments(environment).endpoint
  };

  mkdirp.sync(getProfileDir());
  fs.writeFileSync(getProfileFilename(), JSON.stringify(profile), { encoding: "utf8" });
  return profile;
}

export function deleteUser() {
  try {
    fs.unlinkSync(getProfileFilename());
  } catch (err) {
    if (err.code !== "ENOENT") {
      // File not found is fine, anything else pass on the error
      throw err;
    }
  }
}
