// Information storage and retrieval about the current user
//
// Right now we only support a single logged in user

import * as fs from "fs";
import * as path from "path";
import * as mkdirp from "mkdirp";

import { environments } from "./environments";
import { profileFile, getProfileDir, fileExistsSync } from "../misc";
import { TokenValueType, tokenStore } from "../token-store";

const debug = require("debug")("appcenter-cli:util:profile:profile");

export interface UpdatableProfile {
  userId: string;
  userName: string;
  displayName: string;
  email: string;
  environment: string;
  readonly accessTokenId: Promise<string>;
  readonly endpoint: string;
  defaultApp?: DefaultApp;
}

export interface Profile extends UpdatableProfile {
  readonly accessToken: Promise<string>;
  readonly tokenSuppliedByUser: boolean;
  save(): Profile;
  logout(): Promise<void>;
}

export interface DefaultApp {
  ownerName: string;
  appName: string;
  identifier: string;
}

class ProfileImpl implements Profile {
  userId: string;
  userName: string;
  displayName: string;
  email: string;
  environment: string;
  defaultApp?: DefaultApp;
  tokenSuppliedByUser: boolean;

  get accessTokenId(): Promise<string> {
    return tokenStore.get(this.userName)
      .then((entry) => entry.accessToken.id)
      .catch((err: Error) => {
        debug(`Failed to get token id from profile, error: ${err.message}`);
        throw err;
      });
  }

  get accessToken(): Promise<string> {
    const getter = tokenStore.get(this.userName)
      .catch((err: Error) => tokenStore.get(this.userName, true));

    return getter
      .then((entry) => entry.accessToken.token)
      .catch((err: Error) => {
        debug(`Failed to get token from profile, error: ${err.message}`);
        throw err;
      });
  }

  get endpoint(): string {
    return environments(this.environment).endpoint;
  }

  constructor(fileContents: any) {
    // This is slightly convoluted since file and API use different field names
    // TODO: Normalize to match them up?
    this.userId = fileContents.userId || fileContents.id;
    this.userName = fileContents.userName || fileContents.name;
    this.displayName = fileContents.displayName;
    this.email = fileContents.email;
    this.environment = fileContents.environment;
    this.defaultApp = fileContents.defaultApp;
    this.tokenSuppliedByUser = fileContents.tokenSuppliedByUser || false;
  }

  save(): Profile {
    const profile: any = {
      userId: this.userId,
      userName: this.userName,
      displayName: this.displayName,
      email: this.email,
      environment: this.environment,
      defaultApp: this.defaultApp,
      tokenSuppliedByUser: this.tokenSuppliedByUser
    };

    mkdirp.sync(getProfileDir());
    fs.writeFileSync(getProfileFilename(), JSON.stringify(profile), { encoding: "utf8" });
    return this;
  }

  setAccessToken(token: TokenValueType): Promise<Profile> {
    return tokenStore.set(this.userName, token).then(() => this);
  }

  async logout(): Promise<void> {
    await tokenStore.remove(this.userName);
    try {
      fs.unlinkSync(getProfileFilename());
    } catch (err) {
      if (err.code !== "ENOENT") {
        // File not found is fine, anything else pass on the error
        throw err;
      }
    }
  }
}

const validApp = /^([a-zA-Z0-9-_.]{1,100})\/([a-zA-Z0-9-_.]{1,100})$/;

export function toDefaultApp(app: string): DefaultApp {
  const matches = app.match(validApp);
  if (matches !== null) {
    return {
      ownerName: matches[1],
      appName: matches[2],
      identifier: `${matches[1]}/${matches[2]}`
    };
  }
  return null;
}

let currentProfile: Profile | null = null;

function getProfileFilename(): string {
  const profileDir = getProfileDir();
  return path.join(profileDir, profileFile);
}

function loadProfile(): Profile | null {
  const profilePath = getProfileFilename();
  debug(`Loading profile from ${profilePath}`);
  if (!fileExistsSync(profilePath)) {
    debug("No profile file exists");
    return null;
  }

  debug("Profile file loaded");
  const profileContents = fs.readFileSync(profilePath, "utf8");
  const profile: any = JSON.parse(profileContents);
  return new ProfileImpl(profile);
}

export function getUser(): Profile | null {
  debug("Getting current user from profile");
  if (!currentProfile) {
    debug("No current user, loading from file");
    currentProfile = loadProfile();
  }
  return currentProfile;
}

export function saveUser(user: any, token: TokenValueType, environment: string, tokenSuppliedByUser: boolean): Promise<Profile> {
  return tokenStore.set(user.name, token)
    .then(() => {
      const profile = new ProfileImpl(Object.assign({}, user, { environment, tokenSuppliedByUser }));
      profile.save();
      return profile;
    });
}

export async function deleteUser(): Promise<void> {
  const profile = getUser();
  if (profile) {
    return profile.logout();
  }
}
