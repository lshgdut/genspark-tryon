import type { Job, JobStatus } from '@/libs/trpc/task-manager';

export type TaskStatus = JobStatus;

export interface ITryonCompositedFile {
  filePath?: string
  fileUrl: string
  fileId: string
}

export interface ITryonProgess<T> {
  stage: 'initial' | 'model_composing' | 'cloth_composing' | 'image_generating' | 'image_saving' | 'video_generating' | 'video_saving' | 'done' | 'error'
  status: TaskStatus
  progress?: number
  message?: string
  error?: string
  result?: T
}

export type CompositeJob = Job<ITryonCompositedFile>;
