// Information storage and retrieval about the current user
//
// Right now we only support a single logged in user

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as mkdirp from "mkdirp";

import { CreateAuthTokenResponse } from "../apis/auth-token";
import { GetUserResponse } from "../apis/users";
import { environments } from "./environments";

export class Profile {
  userId: string;
  displayName: string;
  environment: string;
  accessTokenId: string;
  accessToken: string;

  get endpoint(): string {
    return environments(this.environment).endpoint;
  }
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
  }
  return currentProfile;
}

export function saveUser(user: GetUserResponse, token: CreateAuthTokenResponse, environment: string): void {
  let profile = {
    userId: user.id,
    displayName: user.display_name,
    environment,
    accessTokenId: token.id,
    accessToken: token.api_token
  };

  mkdirp.sync(getProfileDir());
  fs.writeFileSync(getProfileFilename(), JSON.stringify(profile), { encoding: "utf8" });
}

export function deleteUser() {
  fs.unlinkSync(getProfileFilename());
}
