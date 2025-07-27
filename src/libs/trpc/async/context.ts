import debug from 'debug';
import { NextRequest } from 'next/server';

import { JWTPayload, TRY_ON_AUTH_HEADER } from '@/const/auth';
import { TryonDatabase } from '@/database/type';
import { KeyVaultsGateKeeper } from '@/server/modules/KeyVaultsEncrypt';

const log = debug('lobe-async:context');

export interface AsyncAuthContext {
  jwtPayload: JWTPayload;
  secret: string;
  serverDB?: TryonDatabase;
  userId?: string | null;
}

/**
 * Inner function for `createContext` where we create the context.
 * This is useful for testing when we don't want to mock Next.js' request/response
 */
export const createAsyncContextInner = async (params?: {
  jwtPayload?: JWTPayload;
  secret?: string;
  userId?: string | null;
}): Promise<AsyncAuthContext> => ({
  jwtPayload: params?.jwtPayload || {},
  secret: params?.secret || '',
  userId: params?.userId,
});

export type AsyncContext = Awaited<ReturnType<typeof createAsyncContextInner>>;

export const createAsyncRouteContext = async (request: NextRequest): Promise<AsyncContext> => {
  // for API-response caching see https://trpc.io/docs/v11/caching

  log('Creating async route context');

  return createAsyncContextInner({ jwtPayload: { userId: 'admin' }, secret: 'admin', userId: 'admin' });

  // const authorization = request.headers.get('Authorization');
  // const tryOnAuthorization = request.headers.get(TRY_ON_AUTH_HEADER);

  // log('Authorization header present: %s', !!authorization);
  // log('TryOn auth header present: %s', !!tryOnAuthorization);

  // if (!authorization) {
  //   log('No authorization header found');
  //   throw new Error('No authorization header found');
  // }

  // if (!tryOnAuthorization) {
  //   log('No TryOn authorization header found');
  //   throw new Error('No TryOn authorization header found');
  // }

  // const secret = authorization?.split(' ')[1];
  // log('Secret extracted from authorization header: %s', !!secret);

  // try {
  //   log('Initializing KeyVaultsGateKeeper');
  //   const gateKeeper = await KeyVaultsGateKeeper.initWithEnvKey();

  //   log('Decrypting TryOn authorization');
  //   const { plaintext } = await gateKeeper.decrypt(tryOnAuthorization);

  //   log('Parsing decrypted authorization data');
  //   const { userId, payload } = JSON.parse(plaintext);

  //   log(
  //     'Successfully parsed authorization data - userId: %s, payload keys: %O',
  //     userId,
  //     Object.keys(payload || {}),
  //   );

  //   return createAsyncContextInner({ jwtPayload: payload, secret, userId });
  // } catch (error) {
  //   log('Error creating async route context: %O', error);
  //   throw error;
  // }
};
