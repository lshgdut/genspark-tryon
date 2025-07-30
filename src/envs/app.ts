import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

import { isServerMode } from '@/const/version';

const isInVercel = process.env.VERCEL === '1';

const vercelUrl = `https://${process.env.VERCEL_URL}`;

const APP_URL = process.env.APP_URL ? process.env.APP_URL : isInVercel ? vercelUrl : undefined;

// only throw error in server mode and server side
if (typeof window === 'undefined' && isServerMode && !APP_URL) {
  throw new Error('`APP_URL` is required in server mode');
}

export const getAppConfig = () => {

  return createEnv({
    client: {
      NEXT_PUBLIC_BASE_PATH: z.string(),
      NEXT_PUBLIC_ENABLE_SENTRY: z.boolean(),
    },
    server: {
      APP_URL: z.string().optional(),
    },
    runtimeEnv: {
      NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || '',

      // Sentry
      NEXT_PUBLIC_ENABLE_SENTRY: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

      APP_URL,
    },
  });
};

export const appEnv = getAppConfig();
