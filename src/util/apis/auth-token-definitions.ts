export interface GetAuthTokenResponse {
  id: string;
  description: string;
  created_at: string;
}


export interface PostAuthTokenRequest {
  "description": string;
}

export interface PostAuthTokenResponse extends GetAuthTokenResponse {
  api_token: string;
}

