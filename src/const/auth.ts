// import { authEnv } from '@/config/auth';

// export const enableClerk = authEnv.NEXT_PUBLIC_ENABLE_CLERK_AUTH;
// export const enableNextAuth = authEnv.NEXT_PUBLIC_ENABLE_NEXT_AUTH;
// export const enableAuth = enableClerk || enableNextAuth || false;
// export const enableAuth = false;

export const TRY_ON_AUTH_HEADER = 'X-tryon-auth';

export const OAUTH_AUTHORIZED = 'X-oauth-authorized';

export const JWT_SECRET_KEY = 'genspark-tryon';
export const NON_HTTP_PREFIX = 'http_nosafe';


export interface JWTPayload {
  /**
   * Represents the user's API key
   *
   * If provider need multi keys like bedrock,
   * this will be used as the checker whether to use frontend key
   */
  apiKey?: string;
  /**
   * Represents the endpoint of provider
   */
  baseURL?: string;

  /**
   * user id
   * in client db mode it's a uuid
   * in server db mode it's a user id
   */
  userId?: string;
}
