// lib/taskManager.ts
type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Job<T> {
  id: string;
  status: JobStatus;
  result?: T;
  error?: string;
  task: () => Promise<T>;
}

// 默认并发限制为1个任务
let concurrencyLimit = 1;
// 当前正在运行的任务数
let runningJobs = 0;
const jobStore = new Map<string, Job<unknown>>();
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
        const result = await job.task();
        jobStore.set(jobId, { ...job, status: 'completed', result });
      } catch (err) {
        jobStore.set(jobId, { ...job, status: 'failed', error: (err as Error).message });
      } finally {
        runningJobs--;
        // 尝试处理队列中的下一个任务
        processQueue();
      }
    })();
  }

  // 继续处理队列中的其他任务
  processQueue();
}

export function createJob<T>(task: () => Promise<T>): Job<T> {
  const jobId = crypto.randomUUID();
  const job: Job<T> = { id: jobId, status: 'pending', task };
  jobStore.set(jobId, job);
  pendingQueue.push(jobId);

  (async () => {
    processQueue()
  })();

  return job;
}

export function getJob<T>(jobId: string): Job<T> | undefined {
  return jobStore.get(jobId) as Job<T>;
}
