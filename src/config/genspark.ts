import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const getGensparkConfig = () => {
  return createEnv({
    runtimeEnv: {
      EMAIL: process.env.GENSPARK_EMAIL,
      PASSWORD: process.env.GENSPARK_PASSWORD,
    },
    server: {
      EMAIL: z.string(),
      PASSWORD: z.string(),
    },
  });
};

export const gensparkEnv = getGensparkConfig();
