
export interface ITryonProgess<T> {
  stage: 'initial' | 'model_composing' | 'cloth_composing' | 'image_generating' | 'image_saving' | 'video_generating' | 'video_saving' | 'done'
  status: "pendding" | "running" | "completed" | "failed"
  progress?: number
  message?: string
  error?: string
  result?: T
}

export interface ITryonCompositedFile {
  filePath?: string
  fileUrl: string
  fileId: string
}
