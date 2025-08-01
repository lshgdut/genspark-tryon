import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const getGensparkConfig = () => {
  return createEnv({
    runtimeEnv: {
      email: process.env.GENSPARK_EMAIL,
      password: process.env.GENSPARK_PASSWORD,
      video_ratio: process.env.GENSPARK_VIDEO_RATIO || '9:16',
      video_duration: process.env.GENSPARK_VIDEO_DURATION || '5 ~ 10s',
      video_model: process.env.GENSPARK_VIDEO_MODEL || 'Kling V1.6 Pro',
      playwright_headless: process.env.GENSPARK_PLAYWRIGHT_HEADLESS !== '0',
      playwright_page_navigation_timeout: process.env.GENSPARK_PLAYWRIGHT_PAGE_NAVIGATION_TIMEOUT || 3 * 60 * 1000,
    },
    server: {
      email: z.string(),
      password: z.string(),
      video_ratio: z.string().optional(),
      video_duration: z.string().optional(),
      video_model: z.string().optional(),
      playwright_headless: z.boolean().optional(),
      playwright_page_navigation_timeout: z.number(),
    },
  });
};

export const gensparkEnv = getGensparkConfig();
