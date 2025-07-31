import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { createJob, getJob } from '@/libs/trpc/task-manager';

const jobProcedure = authedProcedure.use(async (opts) => {
  const { ctx } = opts;

  return opts.next({
    ctx
    // ctx: {
      // fileModel: new FileModel(ctx.serverDB, ctx.userId),
    // },
  });
});

export const jobRouter = router({
  start: jobProcedure
    .input(
      z.object({ inputData: z.string() }),
    )
    .mutation(async ({ ctx, input }) => {
      const job = createJob<string>(async () => {
        // 模拟异步任务，例如下载、API 调用等
        await new Promise((r) => setTimeout(r, 3000));
        return "123";
      });

      return { ...job };
    }),

  getJob: jobProcedure
    .input(
      z.object({ jobId: z.string() }),
    )
    .query(async ({ input }) => {
      const job = getJob(input.jobId);
      if (!job) throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      return job;
    }),
});
