// lib/taskManager.ts
type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

interface Job<T> {
    id: string;
    status: JobStatus;
    result?: T;
    error?: string;
}

const jobStore = new Map<string, Job<unknown>>();

export function createJob<T>(task: () => Promise<T>): string {
    const jobId = crypto.randomUUID();
    jobStore.set(jobId, {id: jobId, status: 'pending' });

    // 异步执行任务
    (async () => {
        try {
          jobStore.set(jobId, { id: jobId, status: 'running' });
            const result = await task();
            jobStore.set(jobId, { id: jobId, status: 'completed', result });
        } catch (err) {
            jobStore.set(jobId, { id: jobId, status: 'failed', error: (err as Error).message });
        }
    })();

    return jobId;
}

export function getJob<T>(jobId: string): Job<T> | undefined {
    return jobStore.get(jobId) as Job<T>;
}
