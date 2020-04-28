export enum PrincipalType {
  USER = "user",
  APP = "app",
}

export const allPrincipalTypes = [PrincipalType.USER, PrincipalType.APP];

export const principalMessaging = {
  [PrincipalType.USER]: "user type",
  [PrincipalType.APP]: "app type",
};
