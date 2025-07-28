import { lambdaClient } from '@/libs/trpc/client';

type JobId = string;
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

interface TaskResult {
  status: TaskStatus;
  result?: any;
  error?: string;
}

export interface ITryonService {
  composeImage(params: {
    modelFileId: string;
    clothFileId: string;
  }): Promise<JobId>;
  
  composeVideo(params: {
    compositeImageUrl: string;
  }): Promise<JobId>;
  
  getTaskStatus(jobId: string): Promise<TaskResult>;
  
  pollTaskStatus<T>(jobId: string, options?: {
    interval?: number;
    timeout?: number;
    onProgress?: (status: TaskStatus) => void;
  }): Promise<T>;
}

export class TryonService implements ITryonService {
  composeImage: ITryonService['composeImage'] = async (params) => {
    const result = await lambdaClient.tryon.composeImage.mutate(params);
    return result.jobId;
  };
  
  composeVideo: ITryonService['composeVideo'] = async (params) => {
    const result = await lambdaClient.tryon.composeVideo.mutate(params);
    return result.jobId;
  };
  
  getTaskStatus: ITryonService['getTaskStatus'] = async (jobId) => {
    const result = await lambdaClient.tryon.getTaskStatus.query({ jobId });
    return result;
  };
  
  pollTaskStatus: ITryonService['pollTaskStatus'] = async (jobId, options = {}) => {
    const {
      interval = 1000,  // 默认轮询间隔1秒
      timeout = 60000,  // 默认超时时间1分钟
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
          const taskStatus = await this.getTaskStatus(jobId);
          
          // 调用进度回调
          if (onProgress) {
            onProgress(taskStatus.status);
          }
          
          // 检查任务是否完成
          if (taskStatus.status === 'completed') {
            return resolve(taskStatus.result);
          }
          
          // 检查任务是否失败
          if (taskStatus.status === 'failed') {
            return reject(new Error(taskStatus.error || '任务执行失败'));
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
}

export const tryonService = new TryonService();