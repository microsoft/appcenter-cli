//
// Definition of a token store
//
import { Observable } from "rxjs";

//
// Object used as token keys.
// Right now just a string, prepping for when we hook up to
// AAD and have to use ADAL tokens.
//
export type TokenKeyType = string;

//
// And the type for the access tokens. Similarly, prepping for
// when the token expands.
//
export interface TokenValueType {
  id: string;
  token: string;
}

// Information stored about in each token
export interface TokenEntry {
  key: TokenKeyType;
  accessToken: TokenValueType;
}

// Interface defining a token store
export interface TokenStore {
  // List all entries in the store for our project
  list(): Observable<TokenEntry>;

  // Get a specific token
  get(key: TokenKeyType, useOldName?: boolean): Promise<TokenEntry>;

  // Add or update a token
  set(key: TokenKeyType, token: TokenValueType): Promise<void>;

  // Remove a token
  remove(key: TokenKeyType): Promise<void>;
}
