import { join } from 'path';
import { cwd } from 'process';
import debug from 'debug';

import { existsSync } from 'fs';
import fs from 'fs/promises';
import { appEnv } from '@/envs/app';

const log = debug('tryon:upload-utils');

/**
 * 获取上传目录路径
 */
export function getComposedDirectory(): string {
  // 从环境变量读取上传目录，如果未设置则使用默认目录
  const composedDir = process.env.TRYON_COMPOSED_DIR || join(cwd(), 'public', 'composited');
  return composedDir;
}

/**
 * 确保合成目录存在
 */
export async function ensureComposedDirectory() {
  try {
    const composedDir = getComposedDirectory();

    if (!existsSync(composedDir)) {
      await fs.mkdir(composedDir, { recursive: true });
    }
    // log(`合成目录已确保存在: ${composedDir}`);
    return composedDir;
  } catch (error) {
    log('创建合成目录失败: %O', error);
    throw error;
  }
}

/**
 * 生成文件URL
 */
export function getComposedFileUrl(fileName: string): string {
  // 如果使用默认的public/uploads目录，则返回相对URL
  return `${appEnv.APP_URL || ''}/composited/${fileName}`;
}

export function getComposedFilePath(fileName: string): string {
  return join(getComposedDirectory(), fileName);
}

export async function saveComposedFile(fileName: string, data: Buffer): Promise<string> {
  const fileDir = await ensureComposedDirectory();
  const filePath = join(fileDir, fileName);
  await fs.writeFile(filePath, data);
  return filePath
}
