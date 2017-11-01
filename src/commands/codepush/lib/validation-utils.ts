import * as semver from "semver";

export function isValidVersion(semverRange: string): boolean {
  return !!semver.valid(semverRange) || /^\d+\.\d+$/.test(semverRange) || /^\d+$/.test(semverRange);
}

export function isValidRollout(rollout: string): boolean {
  return /^(100|[1-9][0-9]|[1-9])$/.test(rollout);
}