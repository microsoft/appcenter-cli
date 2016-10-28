//
// Definition of a token store
//
import { Observable } from "rx";

// Information stored about in each token
export interface TokenEntry {
  key: string;
  accessToken: string;
}

// Interface defining a token store
export interface TokenStore {
  // List all entries in the store for our project
  list(): Observable<TokenEntry>;

  // Get a specific token
  get(key: string): Promise<TokenEntry>;

  // Add or update a token
  set(key: string, token: string): Promise<void>;

  // Remove a token
  remove(key: string): Promise<void>;
}
