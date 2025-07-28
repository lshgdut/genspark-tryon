/**
 * This file contains the root router of Lobe Chat tRPC-backend
 */
import { publicProcedure, router } from '@/libs/trpc/lambda';

import { fileRouter } from './file';
import { jobRouter } from './job';

export const lambdaRouter = router({
  file: fileRouter,
  job: jobRouter,
  healthcheck: publicProcedure.query(() => "i'm live!"),
});

export type LambdaRouter = typeof lambdaRouter;
