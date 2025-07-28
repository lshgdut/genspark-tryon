import { parse } from 'cookie';
import debug from 'debug';
// import { User } from 'next-auth';
import { NextRequest } from 'next/server';

// import {
//   JWTPayload,
//   LOBE_CHAT_AUTH_HEADER,
//   LOBE_CHAT_OIDC_AUTH_HEADER,
//   enableClerk,
//   enableNextAuth,
// } from '@/const/auth';
// import { ClerkAuth, IClerkAuth } from '@/libs/clerk-auth';
// import { validateOIDCJWT } from '@/libs/oidc-provider/jwt';

// Create context logger namespace
const log = debug('tryon-trpc:lambda:context');

export interface AuthContext {
  authorizationHeader?: string | null;
  // clerkAuth?: IClerkAuth;
  // jwtPayload?: JWTPayload | null;
  marketAccessToken?: string;
  // nextAuth?: User;
  resHeaders?: Headers;
  userAgent?: string;
  userId?: string | null;
}

/**
 * Inner function for `createContext` where we create the context.
 * This is useful for testing when we don't want to mock Next.js' request/response
 */
export const createContextInner = async (params?: {
  authorizationHeader?: string | null;
  marketAccessToken?: string;
  // nextAuth?: User;
  userAgent?: string;
  userId?: string | null;
}): Promise<AuthContext> => {
  log('createContextInner called with params: %O', params);
  const responseHeaders = new Headers();

  return {
    authorizationHeader: params?.authorizationHeader,
    marketAccessToken: params?.marketAccessToken,
    // nextAuth: params?.nextAuth,
    resHeaders: responseHeaders,
    userAgent: params?.userAgent,
    userId: params?.userId,
  };
};

export type LambdaContext = Awaited<ReturnType<typeof createContextInner>>;

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/v11/context
 */
export const createLambdaContext = async (request: NextRequest): Promise<LambdaContext> => {
  // we have a special header to debug the api endpoint in development mode
  // IT WON'T GO INTO PRODUCTION ANYMORE
  const isDebugApi = request.headers.get('tryon-auth-dev-backend-api') === '1';
  if (process.env.NODE_ENV === 'development' && isDebugApi) {
    return { userId: process.env.MOCK_DEV_USER_ID };
  }

  log('createLambdaContext called for request');
  // for API-response caching see https://trpc.io/docs/v11/caching

  // const authorization = request.headers.get(LOBE_CHAT_AUTH_HEADER);
  const userAgent = request.headers.get('user-agent') || undefined;

  // get marketAccessToken from cookies
  const cookieHeader = request.headers.get('cookie');
  const cookies = cookieHeader ? parse(cookieHeader) : {};
  const marketAccessToken = cookies['mp_token'];

  log('marketAccessToken from cookie:', marketAccessToken ? '[HIDDEN]' : 'undefined');
  const commonContext = {
    // authorizationHeader: authorization,
    marketAccessToken,
    userAgent,
  };
  // log('LobeChat Authorization header: %s', authorization ? 'exists' : 'not found');

  let userId = 'admin';
  // let auth;

  // if (enableNextAuth) {
  //   log('Attempting NextAuth authentication');
  //   try {
  //     const { default: NextAuthEdge } = await import('@/libs/next-auth/edge');

  //     const session = await NextAuthEdge.auth();
  //     if (session && session?.user?.id) {
  //       auth = session.user;
  //       userId = session.user.id;
  //       log('NextAuth authentication successful, userId: %s', userId);
  //     } else {
  //       log('NextAuth authentication failed, no valid session');
  //     }
  //     return createContextInner({
  //       nextAuth: auth,
  //       ...commonContext,
  //       userId,
  //     });
  //   } catch (e) {
  //     log('NextAuth authentication error: %O', e);
  //     console.error('next auth err', e);
  //   }
  // }

  // Final return, userId may be undefined
  log(
    'All authentication methods attempted, returning final context, userId: %s',
    userId || 'not authenticated',
  );
  return createContextInner({ ...commonContext, userId });
};
