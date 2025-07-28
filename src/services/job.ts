import { lambdaClient } from '@/libs/trpc/client';

export interface JobItem {
  createdAt?: Date;
  id: string;
  name?: string;
  size?: number;
  type?: string;
  updatedAt?: Date;
  status: string;
}

export interface IJobService {
  start(inputData: object): Promise<{ id: string; }>;
  getJob(id: string): Promise<JobItem>;
}

export class JobService implements IJobService {
  start: IJobService['start'] = async () => {
    const item = await lambdaClient.job.start.mutate({ inputData: '123' });

    return { id: item.jobId };
  };

  getJob: IJobService['getJob'] = async (id) => {
    const item = await lambdaClient.job.getJob.query({ jobId: id });

    if (!item) {
      throw new Error('job not found');
    }
    return item
  };

}

export const jobService = new JobService();
