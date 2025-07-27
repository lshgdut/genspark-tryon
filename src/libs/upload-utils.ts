import { mkdir } from 'fs/promises';
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
 * 生成文件URL
 */
export function getFileUrl(fileName: string): string {
  // 如果使用默认的public/uploads目录，则返回相对URL
  const defaultDir = join(cwd(), 'public', 'uploads');
  const uploadDir = getUploadDirectory();
  
  if (uploadDir === defaultDir) {
    return `/uploads/${fileName}`;
  } else {
    // 如果使用自定义目录，则返回完整的文件路径
    // 注意：这种情况下可能需要额外的路由配置来提供文件访问
    return join(uploadDir, fileName);
  }
}