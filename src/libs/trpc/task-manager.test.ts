// @vitest-environment node
import { describe, it, beforeEach, vi, expect } from 'vitest';

import { createJob, getJob, setConcurrencyLimit } from './task-manager';

describe('task-manager', () => {
  beforeEach(() => {
    // 重置模块状态
    vi.resetModules();
  });

  it('should create a job and return a job ID', () => {
    const job = createJob(async () => 'result');
    const jobId = job.id;

    expect(jobId).toBeDefined();
    expect(typeof jobId).toBe('string');
  });

  it('should track job status correctly', async () => {
    let job = createJob(async () => 'result');

    // 初始状态应该是 pending
    expect(job?.status).toBe('pending');

    // 等待任务完成
    await new Promise((resolve) => setTimeout(resolve, 10));

    job = getJob(job.id)!
    // 任务应该已完成并处于 completed 状态
    expect(job?.status).toBe('completed');
    expect(job?.result).toBe('result');
  });

  it('should handle job errors correctly', async () => {
    let job = createJob(async () => {
      throw new Error('Test error');
    });

    // 等待任务完成
    await new Promise((resolve) => setTimeout(resolve, 10));

    job = getJob(job.id)!;
    expect(job?.status).toBe('failed');
    expect(job?.error).toBe('Test error');
  });

  it('should respect concurrency limit', async () => {
    // 设置并发限制为2
    setConcurrencyLimit(2);

    // 创建5个需要较长时间完成的任务
    const jobIds: string[] = [];
    const longRunningTask = () => new Promise(resolve => setTimeout(() => resolve('done'), 100));

    for (let i = 0; i < 5; i++) {
      jobIds.push(createJob(longRunningTask).id);
    }

    // 等待一小段时间以确保任务调度
    await new Promise((resolve) => setTimeout(resolve, 10));

    const jobs = jobIds.map(id => getJob(id));

    // 前两个应该是 running 或 completed（因为任务很简单，可能已经完成了）
    expect(['running', 'completed']).toContain(jobs[0]?.status);
    expect(['running', 'completed']).toContain(jobs[1]?.status);

    // 第三个应该是 pending（因为我们限制了并发为2）
    expect(jobs[2]?.status).toBe('pending');

    // 清理 - 等待所有任务完成
    await new Promise((resolve) => setTimeout(resolve, 150));
  });

});
