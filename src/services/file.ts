import { lambdaClient } from '@/libs/trpc/client';

type fileId = string

export interface IFileService {
  upload(file: {
    name: string;
    type: string;
    size: number;
    base64: string;
  }): Promise<fileId>;
}

export class FileService implements IFileService {
  upload: IFileService['upload'] = async (file) => {
    const result = await lambdaClient.file.upload.mutate({ file });
    return result.fileId;
  };
}

export const fileService = new FileService();
