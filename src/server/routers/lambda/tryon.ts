import debug from 'debug';

import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { authedProcedure, router } from '@/libs/trpc/lambda';
import { createJob, getJob } from '@/libs/trpc/task-manager';

import { compositeImage, compositeVideo } from '@/server/services/tryon';


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
        const job = createJob(async () => {
          // 模拟AI处理过程
          // await new Promise((resolve) => setTimeout(resolve, 3000));

          let imageFile
          for await (const progress of compositeImage({ modelFileId, clothFileId })) {
            log(`合成图片进度: ${progress.progress}%, 状态: ${progress.status}`);
            if (progress.status === 'completed') {
              imageFile = progress.result
              break;
            }
            if (progress.status === 'failed') {
              console.log(`合成图片失败: ${progress.error}`);
              break
            }
          }
          if (!imageFile) {
            throw new Error('图片合成失败, 无法获取合成图片地址');
          }
          // 返回结果
          return imageFile;
        });

        return { ...job };
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
        fileId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { fileId } = input;

        log(`开始生成视频任务，合成图片URL: ${fileId}`);

        // 创建异步任务
        const job = createJob(async () => {
          let videoFile
          for await (const progress of compositeVideo({ fileId })) {
            log(`合成视频进度: ${progress.progress}%, 状态: ${progress.status}`);
            if (progress.status === 'completed') {
              videoFile = progress.result
              break;
            }
            if (progress.status === 'failed') {
              console.log(`合成视频失败: ${progress.error}`);
              break
            }
            // 更新任务进度
            // updateJobProgress(jobId, progress.progress);
          }

          if (!videoFile) {
            throw new Error('视频合成失败, 无法获取合成视频地址');
          }
          // 返回结果
          return videoFile;
        });

        return { ...job };
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

  // subscribeTaskStatus: authedProcedure
  //   .input(
  //     z.object({
  //       jobId: z.string(),
  //     }),
  //   )
  //   .subscription(async function* ({ input }) {
  //     const { jobId } = input;

  //     // 检查任务是否存在
  //     let job = getJob(jobId);
  //     if (!job) {
  //       throw new TRPCError({
  //         code: 'NOT_FOUND',
  //         message: '任务不存在'
  //       });
  //     }

  //     // 立即发送当前状态
  //     yield job;

  //     // 定时检查任务状态变化
  //     while (job.status !== 'completed' && job.status !== 'failed') {
  //       await new Promise(resolve => setTimeout(resolve, 1000));

  //       job = getJob(jobId);
  //       if (!job) {
  //         throw new TRPCError({
  //           code: 'NOT_FOUND',
  //           message: '任务不存在'
  //         });
  //       }

  //       yield job;
  //     }
  //   }),
});
