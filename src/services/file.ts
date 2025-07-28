import { lambdaClient } from '@/libs/trpc/client';

export interface FileItem {
  fileId: string;
  success: boolean;
}

export interface IFileService {
  upload(file: {
    name: string;
    type: string;
    size: number;
    base64: string;
  }): Promise<FileItem>;
}

export class FileService implements IFileService {
  upload: IFileService['upload'] = async (file) => {
    const result = await lambdaClient.file.upload.mutate({ file });
    return result;
  };
}

export const fileService = new FileService();