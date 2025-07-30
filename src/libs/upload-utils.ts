import { mkdir,access } from 'fs/promises';
import { join } from 'path';
import { cwd } from 'process';
import debug from 'debug';

const log = debug('tryon:upload-utils');

/**
 * 获取上传目录路径
 */
export function getUploadDirectory(): string {
  // 从环境变量读取上传目录，如果未设置则使用默认目录
  const uploadDir = process.env.TRYON_UPLOAD_DIR || join(cwd(), 'public', 'uploads');
  return uploadDir;
}

/**
 * 确保上传目录存在
 */
export async function ensureUploadDirectory() {
  try {
    const uploadsDir = getUploadDirectory();
    await mkdir(uploadsDir, { recursive: true });
    log(`上传目录已确保存在: ${uploadsDir}`);
    return uploadsDir;
  } catch (error) {
    log('创建上传目录失败: %O', error);
    throw error;
  }
}

/**
 * 获取上传文件路径
 */
export async function getUploadFilePath(fileName: string): Promise<string | null> {
  try {
    const uploadsDir = getUploadDirectory();
    const filePath = join(uploadsDir, fileName);
    await access(filePath);

    return filePath;
  } catch {
    return null;
  }
}
