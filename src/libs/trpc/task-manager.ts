// lib/taskManager.ts
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobContext {
  jobId: string;
}

export interface Job<T> {
  id: string;
  status: JobStatus;
  result?: T;
  message?: string;
}

export type JobTask = (ctx: JobContext) => Promise<any>;

// 默认并发限制为1个任务
let concurrencyLimit = 1;
// 当前正在运行的任务数
let runningJobs = 0;
const jobStore = new Map<string, Job<any>>();
const jobTaskStore = new Map<string, JobTask>();
const pendingQueue: string[] = [];

// 设置并发限制
export function setConcurrencyLimit(limit: number): void {
  concurrencyLimit = limit;
}

// 处理队列中的任务
function processQueue(): void {
  // 如果运行中的任务数已达到限制或队列为空，则不处理
  if (runningJobs >= concurrencyLimit || pendingQueue.length === 0) {
    return;
  }

  const jobId = pendingQueue.shift();
  if (!jobId) return;

  const job = jobStore.get(jobId);
  if (job && job.status === 'pending') {
    runningJobs++;
    jobStore.set(jobId, { ...job, status: 'running' });

    // 异步执行任务
    (async () => {
      try {
        const ctx = { jobId: jobId}
        const result = await jobTaskStore.get(jobId)!(ctx);
        jobStore.set(jobId, { ...job, status: 'completed', result });
      } catch (err) {
        jobStore.set(jobId, { ...job, status: 'failed', message: (err as Error).message });
      } finally {
        runningJobs--;
        // 尝试处理队列中的下一个任务
        processQueue();

        setTimeout(() => {
          deleteJob(job.id);
        }, 10 * 60 * 1000);
      }
    })();
  }

  // 继续处理队列中的其他任务
  processQueue();
}

export function createJob<T>(task: JobTask): Job<T> {
  const jobId = crypto.randomUUID();
  const job = { id: jobId, status: 'pending' } as Job<T>;
  jobStore.set(jobId, job);
  jobTaskStore.set(jobId, task);
  pendingQueue.push(jobId);

  (async () => {
    processQueue()
  })();

  return job;
}

export function getJob<T>(jobId: string): Job<T> | undefined {
  const job = jobStore.get(jobId) as Job<T>;
  if (job && job.status === 'pending') {
    const position = pendingQueue.indexOf(jobId);
    job.message = `任务排队中，当前队列：${position + 1}`
  }
  return job;
}

export function updateJob(jobId: string, update: Partial<Exclude<Job<any>, 'id'>>) {
  const job = jobStore.get(jobId);
  if (job) {
    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error("Job is completed or failed");
    }
    jobStore.set(jobId, {
      ...job,
      ...update,
    });
  }
}
export function deleteJob(jobId: string): void {
  jobStore.delete(jobId);
  jobTaskStore.delete(jobId);
}
