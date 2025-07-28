/**
 * This file contains the root router of Lobe Chat tRPC-backend
 */
import { publicProcedure, router } from '@/libs/trpc/lambda';

import { fileRouter } from './file';
import { jobRouter } from './job';
import { tryonRouter } from './tryon';

export const lambdaRouter = router({
  file: fileRouter,
  job: jobRouter,
  tryon: tryonRouter,
  healthcheck: publicProcedure.query(() => "i'm live!"),
});

export type LambdaRouter = typeof lambdaRouter;
