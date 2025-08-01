import { join } from 'path';
import { cwd } from 'process';
import debug from 'debug';

import * as node_fs from 'node:fs';
import * as https from 'https';

import type {Page} from 'playwright'

import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { appEnv } from '@/envs/app';
import { gensparkEnv } from '@/config/genspark';

const log = debug('tryon:upload-utils');

export const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

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


/**
 * playwright utils
 */


export async function pw_check_user(page: Page): Promise<boolean> {
  const url = 'https://www.genspark.ai/api/user'
  const resp = await page.goto(url)
  const body = await resp?.json()

  if (body.status != 0) {
    log("未登录，需要重新登录")
    return false
  }
  return true
}

export async function pw_ensureLoggedIn(page: Page) {
  // 必然没登录，先不校验
  // if (await check_user(page)) {
  //     return
  // }

  try {
    log('未登录，开始登录...');
    await page.goto('https://www.genspark.ai/api/login?redirect_url=%2F', { waitUntil: 'domcontentloaded' });

    await page.click("#loginWithEmailWrapper")
    await page.locator('#email').fill(gensparkEnv.email);
    await page.locator('input[type="password"]').fill(gensparkEnv.password);
    await page.click('button[type="submit"]')

    // await page.waitForTimeout(3000);
    await page.waitForURL("https://www.genspark.ai/**", { waitUntil: 'commit' })
    log('登录成功，重新加载页面');
  } catch (e) {
    log('登录失败 ', e);
    throw e
  }
}

export function pw_downloadFileStream(url: string): Promise<string> {

  const fileName = `${uuidv4()}.mp4`;
  const outputPath = getComposedFilePath(fileName);

  return new Promise((resolve, reject) => {
    const file = node_fs.createWriteStream(outputPath);

    https.get(url, {
      headers: {
        "user-agent": USER_AGENT
      }
    }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed with status ${response.statusCode}`));
        return;
      }
      // log(response.headers['content-length'], response.headers['content-type'])
      // const contentType = response.headers['content-type'];
      // if (!contentType || !contentType.startsWith('video/')) {
      //   reject(new Error(`Invalid content type: ${contentType}`));
      //   return;
      // }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        // log('✅ 文件已保存:', outputPath);
        resolve(outputPath);
      });
    }).on('error', (err) => {
      node_fs.unlinkSync(outputPath);
      reject(err);
    });
  });
}
