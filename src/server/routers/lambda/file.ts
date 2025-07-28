import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { ensureUploadDirectory } from '@/libs/upload-utils';
import debug from 'debug';

const log = debug('tryon:file-router');

// 设置最大文件大小 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 允许的文件类型
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];

export const fileRouter = router({
  upload: authedProcedure
    .input(
      z.object({
        file: z.object({
          name: z.string(),
          type: z.string(),
          size: z.number(),
          base64: z.string()
        })
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { file } = input;
        
        // 检查文件大小
        if (file.size > MAX_FILE_SIZE) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: '文件大小超过限制 (5MB)' 
          });
        }

        // 检查文件类型
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: '不支持的文件类型' 
          });
        }

        // 创建唯一的文件名 (使用UUID)
        const fileExtension = file.name.split('.').pop() || '';
        const fileName = `${uuidv4()}.${fileExtension}`;

        // 确保上传目录存在
        const uploadsDir = await ensureUploadDirectory();
        const filePath = join(uploadsDir, fileName);

        // 将base64转换为Buffer
        const base64Data = file.base64.split(',')[1] || file.base64;
        const fileBuffer = Buffer.from(base64Data, 'base64');

        // 写入文件
        await writeFile(filePath, fileBuffer);

        // 返回成功响应
        return {
          success: true,
          fileId: fileName
        };
      } catch (error) {
        log('文件上传错误: %O', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '文件上传失败',
          cause: error
        });
      }
    }),
});