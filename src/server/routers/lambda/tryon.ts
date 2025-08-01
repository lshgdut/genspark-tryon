import debug from 'debug';

import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { authedProcedure, router } from '@/libs/trpc/lambda';
import { createJob, getJob, updateJob } from '@/libs/trpc/task-manager';

import { compositeImage, compositeVideo } from '@/server/services/tryon';
import { CompositeJob, ITryonCompositedFile } from '@/types/tryon';


const log = debug('tryon:tryon-router');

export const tryonRouter = router({
  composeImage: authedProcedure
    .input(
      z.object({
        modelFileId: z.string(),
        clothFileId: z.string(),
      }),
    )
    .mutation<CompositeJob>(async ({ input }) => {
      try {
        const { modelFileId, clothFileId } = input;

        log(`开始合成图片任务，模型文件ID: ${modelFileId}, 服装文件ID: ${clothFileId}`);

        // 创建异步任务
        const job = createJob<ITryonCompositedFile>(async (ctx) => {
          // // 模拟AI处理过程
          // await new Promise((resolve) => setTimeout(resolve, 3000));
          // updateJob(ctx.job_id, {status: 'running', message: '处理中...20%'})
          // await new Promise((resolve) => setTimeout(resolve, 3000));

          // updateJob(ctx.job_id, { status: 'running', message: '处理中...30%' })
          // await new Promise((resolve) => setTimeout(resolve, 3000));
          // updateJob(ctx.job_id, { status: 'running', message: '处理中...60%' })
          // await new Promise((resolve) => setTimeout(resolve, 3000));

          // let imageFile  = {
          //   // filePath: ''
          //   fileUrl: 'http://localhost:3000/composited/157b650f-a965-48f6-90ff-5f23c0480e42.png',
          //   fileId: '157b650f-a965-48f6-90ff-5f23c0480e42.png'
          // }
          let imageFile
          for await (const progress of compositeImage({ modelFileId, clothFileId })) {
            log(`合成图片进度: ${progress.progress}%, 状态: ${progress.status}`);
            if (progress.status === 'completed') {
              imageFile = progress.result
              updateJob(ctx.jobId, { status: 'completed', result: progress.result })
              break;
            }
            if (progress.status === 'failed') {
              console.log(`合成图片失败: ${progress.error}`);
              updateJob(ctx.jobId, { status: 'failed', result: progress.result })
              break
            }
            updateJob(ctx.jobId, { status: 'running', message: `正在生成(${progress.progress}%)` || '' })
          }
          // 返回结果
          return imageFile;
        });

        // 从返回的对象中移除 task 属性
        return job;
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
    .mutation<CompositeJob>(async ({ input }) => {
      try {
        const { fileId } = input;

        log(`开始生成视频任务，合成图片URL: ${fileId}`);

        // 创建异步任务
        const job = createJob<ITryonCompositedFile>(async (ctx) => {
          let videoFile
          for await (const progress of compositeVideo({ fileId })) {
            log(`合成视频进度: ${progress.progress}%, 状态: ${progress.status}`);
            if (progress.status === 'completed') {
              videoFile = progress.result
              updateJob(ctx.jobId, { status: 'completed', result: progress.result })
              break;
            }
            if (progress.status === 'failed') {
              console.log(`合成视频失败: ${progress.error}`);
              updateJob(ctx.jobId, { status: 'failed', result: progress.result })
              break
            }
            // 更新任务进度
            updateJob(ctx.jobId, { status: 'running', message: `正在生成(${progress.progress}%)` || '' })
          }
          // 返回结果
          return videoFile;
        });

        return job;
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

      // 从返回的对象中移除 task 属性
      const { task, ...jobWithoutTask } = job as any;
      return jobWithoutTask;
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
