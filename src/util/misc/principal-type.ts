import { failure, ErrorCodes } from "../commandline";

export enum PrincipalType {
  USER = "user",
  APP = "app",
}

export const allPrincipalTypes = [PrincipalType.USER, PrincipalType.APP];

export function validatePrincipalType(principalType: PrincipalType): Promise<void> {
  if (allPrincipalTypes.includes(principalType)) {
    return;
  }
  throw failure(
    ErrorCodes.InvalidParameter,
    "Provided token type is invalid. Should be one of: [" + allPrincipalTypes.join(", ") + "]"
  );
}
