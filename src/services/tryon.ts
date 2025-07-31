import { lambdaClient } from '@/libs/trpc/client';
import type { Job } from '@/libs/trpc/task-manager';
import type { ITryonCompositedFile } from '@/types/tryon';

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

type CompositeJob = Job<ITryonCompositedFile>;

export interface ITryonService {
  composeImage(params: {
    modelFileId: string;
    clothFileId: string;
  }): Promise<CompositeJob>;

  composeVideo(params: {
    fileId: string;
  }): Promise<CompositeJob>;

  getTaskStatus(jobId: string): Promise<CompositeJob>;

  pollTaskStatus(jobId: string, options?: {
    interval?: number;
    timeout?: number;
    onProgress?: (status: TaskStatus) => void;
  }): Promise<ITryonCompositedFile>;

  // subscribeTaskStatus(jobId: string): Promise<TaskResult>;
}

export class TryonService implements ITryonService {
  composeImage: ITryonService['composeImage'] = async (params) => {
    const result = await lambdaClient.tryon.composeImage.mutate(params);
    return result;
  };

  composeVideo: ITryonService['composeVideo'] = async (params) => {
    const result = await lambdaClient.tryon.composeVideo.mutate(params);
    return result;
  };

  getTaskStatus: ITryonService['getTaskStatus'] = async (jobId) => {
    const result = await lambdaClient.tryon.getTaskStatus.query({ jobId });
    return result as CompositeJob;
  };

  pollTaskStatus: ITryonService['pollTaskStatus'] = async (jobId, options = {}) => {
    const {
      interval = 3000,  // 默认轮询间隔3秒
      timeout = 60 * 60 * 1000,  // 默认超时时间1小时
      onProgress
    } = options;

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          // 检查是否超时
          if (Date.now() - startTime > timeout) {
            return reject(new Error('任务轮询超时'));
          }

          // 获取任务状态
          const taskResult = await this.getTaskStatus(jobId);

          // 调用进度回调
          if (onProgress) {
            onProgress(taskResult.status);
          }

          // 检查任务是否完成
          if (taskResult.status === 'completed') {
            return resolve(taskResult.result as ITryonCompositedFile);
          }

          // 检查任务是否失败
          if (taskResult.status === 'failed') {
            return reject(new Error(taskResult.error || '任务执行失败'));
          }

          // 继续轮询
          setTimeout(checkStatus, interval);
        } catch (error) {
          reject(error);
        }
      };

      // 开始轮询
      checkStatus();
    });
  };

  // subscribeTaskStatus: ITryonService['subscribeTaskStatus'] = async (jobId) => {

  //   return new Promise<TaskResult>((resolve, reject) => {
  //     let result: TaskResult

  //     lambdaClient.tryon.subscribeTaskStatus.subscribe({ jobId }, {
  //       onData: (value) => {
  //         // resolve(value);
  //         console.log('sub',value)
  //         result = value;
  //       },
  //       onComplete: () => {
  //         // console.log("")
  //         resolve({
  //           status: "completed",
  //           result: result
  //         });
  //       },
  //       onError: (error) => {
  //         reject({
  //           status: "error",
  //           error: error.message,
  //         });
  //       }
  //     });
  //   });
  // };
}

export const tryonService = new TryonService();
