import pkg from '@/../package.json';

export const CURRENT_VERSION = pkg.version;

export const isServerMode = process.env.NEXT_PUBLIC_SERVICE_MODE === 'server';
export const isUsePgliteDB = process.env.NEXT_PUBLIC_CLIENT_DB === 'pglite';

export const isDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP_APP === '1';

export const isDeprecatedEdition = !isServerMode && !isUsePgliteDB;
