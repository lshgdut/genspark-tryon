import { chromium } from 'playwright';
import { type Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import debug from 'debug';

import { retry } from '@/server/utils/proc';
import { getUploadFilePath } from '@/libs/upload-utils'
import { saveComposedImage, getComposedFileUrl } from '@/server/services/tryon/_utils';

import { gensparkEnv } from '@/config/genspark';

const log = debug('tryon:generate-image');
const photoUploadUrl = 'https://www.genspark.ai/fashion/my_photo';
const clothingUploadUrl = 'https://www.genspark.ai/fashion/uploadCustom?from=image_studio';


async function check_user(page: Page): Promise<boolean> {
  const url = 'https://www.genspark.ai/api/user'
  const resp = await page.goto(url)
  const body = await resp?.json()

  if (body.status != 0) {
    log("未登录，需要重新登录")
    return false
  }
  return true
}

async function ensureLoggedIn(page: Page) {
  // 必然没登录，先不校验
  // if (await check_user(page)) {
  //     return
  // }

  try {
    log('未登录，开始登录...');
    await page.goto('https://www.genspark.ai/api/login?redirect_url=%2F');

    await page.click("#loginWithEmailWrapper")
    await page.locator('#email').fill(gensparkEnv.EMAIL);
    await page.locator('input[type="password"]').fill(gensparkEnv.PASSWORD);
    await page.click('button[type="submit"]')

    // await page.waitForTimeout(3000);
    await page.waitForURL("https://www.genspark.ai/**", { waitUntil: 'commit' })
    log('登录成功，重新加载页面');
  } catch (e) {
    log('登录失败 ', e);
  }
}

// import { createParser, EventSourceMessage } from 'eventsource-parser';

async function fetchTryonTask(page: Page, clothingPath: string) {
  const url = "https://www.genspark.ai/api/spark/tryon_running_tasks?task_source=FASHION_TRYON"
  const resp = await page.goto(url)
  const body = await resp?.json()
  // const content = await page.locator("pre").textContent()
  // const data = JSON.parse(content!).data
  const data = body.data
  const task = body.data.running_tasks.find((task: any) => {
    if (task.additional_info.model_image_url === clothingPath) {
      return true
    }
  })
  if (!task.id) {
    log("未找到对应的任务，当前任务为:", data.running_tasks)
    return null
  }
  return task.id
}

async function fetchTryOnResult(page: Page, clothingPath: string) {
  // // 先获取任务 id
  // const taskId = await fetchTryonTask(page, clothingPath)
  // log("获取到任务:", taskId)

  const url = 'https://www.genspark.ai/fashion/stylist'
  await page.goto(url)

  const imgEl = await page.waitForSelector("div.image-generated > .image-grid > img", { timeout: 180000 })
  const src = await imgEl.getAttribute('src')
  if (src) {
    log('获取到图片:', src)
    return src
  }
  return null
}

async function uploadPhoto(page: Page, photoId: string): Promise<string | null> {
  log("打开模特照片上传页面")
  await page.goto(photoUploadUrl);

  const photoPath = await getUploadFilePath(photoId)
  if (!photoPath) {
    throw new Error("未找到照片文件: " + photoId)
  }

  log("开始上传模特照片")
  return await retry(async () => {
    try {
      const previousSrc = await page.locator("img.preview-image").getAttribute('src')

      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 5000 }),
        page.click('css=div.add-new-photo'),
      ]);

      await fileChooser.setFiles(photoPath);
      log("模特照片上传中")

      const new_src = await retry(async () => {
        const src = await page.locator("img.preview-image").getAttribute("src")
        if (src && src !== previousSrc) {
          return src
        }
        throw new Error("上传未完成，等待尝试")
      }, { maxRetries: 10, backoff: 2000 })

      if (new_src) {
        log('模特照片上传成功:', new_src);
        return new_src
      }
      throw new Error("照片上传失败, new_src=", new_src)
    } catch (e) {
      log('未弹出文件选择，刷新重试...', e);
      // await page.waitForTimeout(5000);
      await page.reload();
      throw e
      // TODO
      /**
       *
          33 |     this.name = "TimeoutError";
          34 |   }
          35 | }
          36 | class TargetClosedError extends Error {
          37 |   constructor(cause) {
          38 |     super(cause || "Target page, context or browser has been closed");
                  ^
          error: reload: Target page, context or browser has been closed
              at /Users/wenhua/develop/01github/mcp-playweight-ts/node_modules/playwright-core/lib/client/errors.js:38:5
       */
    }
  })
  // // 等待几秒钟让页面显示
  // await page.waitForTimeout(5000);
}

async function uploadClothing(page: Page, clothFileId: string) {
  log("开始上传服装")
  await page.goto(clothingUploadUrl);

  const clothingPath = await getUploadFilePath(clothFileId)
  if (!clothingPath) {
    throw new Error("未找到服装文件: " + clothFileId)
  }

  return await retry(async () => {
    try {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 5000 }),
        page.locator(".relative>div.cursor-pointer", { hasText: "点击上传图片" }).click(),
      ]);
      log("衣服正在上传")
      await fileChooser.setFiles(clothingPath);

      const imgEl = await page.waitForSelector("img[alt='uploadImageUrl']")
      const cloth_src = await imgEl.getAttribute('src')
      log('衣服上传成功:', cloth_src);

      // // 检查按钮状态
      // await page.waitForTimeout(1000); // 等待按钮渲染
      // const buttonEnabled = await page.evaluate(() => {
      //     const el = document.querySelector('.try-on-button');
      //     return el && !el.classList.contains("opacity-50")
      // });

      // if (!buttonEnabled) {
      //     log('按钮不是就续，重试...');
      //     await page.reload();
      //     continue;
      // }

      // 点击按钮并等待跳转
      await page.click('.try-on-button'),
        await page.waitForURL("https://www.genspark.ai/fashion/stylist", { waitUntil: 'commit' })
      log('试穿跳转成功');
      return cloth_src
    } catch (err) {
      log('上传或跳转失败，刷新重试...', err);
      await page.reload();
      throw err
    }
  })
}

async function saveResultImage(page: Page, imageUrl: string): Promise<string> {
  const imageResp = await page.evaluate(async (url: string) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    return Array.from(new Uint8Array(buf));
  }, imageUrl);

  // 生成结果文件名
  const fileName = `composed-${uuidv4()}.png`;
  const realPath = await saveComposedImage(fileName, Buffer.from(imageResp))
  log('结果图片保存成功:', realPath);

  return await getComposedFileUrl(fileName)
}

// https://www.genspark.ai/fashion/target?id=60f3dd9fe107ad62fde489b7a525bed6&pr=1&from=tryon
export async function composeImage(params: {
  modelFileId: string;
  clothFileId: string;
}) {
  const browser = await chromium.launch({ headless: false }); // 设置 headless 为 false 可以看到浏览器界面
  const context = await browser.newContext();

  const page = await context.newPage();
  try {
    await ensureLoggedIn(page)

    const [model_src, cloth_src] = await Promise.all([
      uploadPhoto(page, params.modelFileId),
      uploadClothing(page, params.clothFileId)
    ]);

    if (!model_src) {
      throw new Error("模特照片上传失败");
    }
    if (!cloth_src) {
      throw new Error("服装照片上传失败");
    }

    const img = await fetchTryOnResult(page, cloth_src);
    if (img) {
      return await saveResultImage(page, img)
    }

    throw new Error("试穿失败")
  } catch (error) {
    log("error:", error)
    await page.waitForTimeout(60000);
  } finally {
    // log("closing in 5s");
    await page.close()
    await context.close();
    await browser.close();
  }
}

// async function main() {
//     await openUrl();
//     log('流程完成 ✅');
// }

// main().catch(console.error);
