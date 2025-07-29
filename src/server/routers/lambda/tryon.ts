import debug from 'debug';

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { basename } from 'path';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { createJob, getJob } from '@/libs/trpc/task-manager';

import { composeImage } from '@/server/services/tryon/generate-image';


const log = debug('tryon:tryon-router');

export const tryonRouter = router({
  composeImage: authedProcedure
    .input(
      z.object({
        modelFileId: z.string(),
        clothFileId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { modelFileId, clothFileId } = input;

        log(`开始合成图片任务，模型文件ID: ${modelFileId}, 服装文件ID: ${clothFileId}`);

        // 创建异步任务
        const jobId = createJob(async () => {
          // 模拟AI处理过程
          // await new Promise((resolve) => setTimeout(resolve, 3000));

          const imageUrl = await composeImage({
            modelFileId,
            clothFileId,
          });
          if (!imageUrl) {
            throw new Error('图片合成失败, imageUrl 为空');
          }
          // 返回结果
          return {
            imageUrl,
            fileName: basename(imageUrl)
          };
        });

        return { jobId };
      } catch (error) {
        log('创建图片合成任务失败: %O', error);
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '创建图片合成任务失败',
          cause: error
        });
      }
    }),

  composeVideo: authedProcedure
    .input(
      z.object({
        compositeImageUrl: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { compositeImageUrl } = input;

        log(`开始生成视频任务，合成图片URL: ${compositeImageUrl}`);

        // 创建异步任务
        const jobId = createJob(async () => {
          try {
            // 模拟AI处理过程
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // 生成结果文件名（实际项目中这里应该是真正的AI处理逻辑）
            // const resultFileName = `video-${uuidv4()}.mp4`;
            const resultFileName = 'm2-regenerated.mp4';

            // 返回结果
            return {
              videoUrl: resultFileName,
              fileName: resultFileName
            };
          } catch (error) {
            log('视频生成处理失败: %O', error);
            throw error;
          }
        });

        return { jobId };
      } catch (error) {
        log('创建视频生成任务失败: %O', error);
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '创建视频生成任务失败',
          cause: error
        });
      }
    }),

  getTaskStatus: authedProcedure
    .input(
      z.object({
        jobId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const { jobId } = input;

      const job = getJob(jobId);
      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '任务不存在'
        });
      }

      return job;
    }),

  subscribeTaskStatus: authedProcedure
    .input(
      z.object({
        jobId: z.string(),
      }),
    )
    .subscription(async function* ({ input }) {
      const { jobId } = input;

      // 检查任务是否存在
      let job = getJob(jobId);
      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '任务不存在'
        });
      }

      // 立即发送当前状态
      yield job;

      // 定时检查任务状态变化
      while (job.status !== 'completed' && job.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));

        job = getJob(jobId);
        if (!job) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '任务不存在'
          });
        }

        yield job;
      }
    }),
});
