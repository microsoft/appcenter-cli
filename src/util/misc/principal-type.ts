export enum PrincipalType {
  USER = "user",
  APP = "app",
}

export const allPrincipalTypes = [PrincipalType.USER, PrincipalType.APP];

export const principalMessaging = {
  [PrincipalType.USER]: "User level",
  [PrincipalType.APP]: "App level",
};
