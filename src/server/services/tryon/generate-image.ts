import { chromium } from 'playwright';
import { type Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import debug from 'debug';

import { retry } from '@/server/utils/proc';
import { getUploadFilePath } from '@/libs/upload-utils'
import {
  saveComposedFile,
  getComposedFileUrl,
  pw_ensureLoggedIn,
  USER_AGENT,
} from './_utils';


import { ITryonProgess, ITryonCompositedFile } from '@/types/tryon';

const log = debug('tryon:generate-image');

const photoUploadUrl = 'https://www.genspark.ai/fashion/my_photo';
const clothingUploadUrl = 'https://www.genspark.ai/fashion/uploadCustom?from=image_studio';

// import { createParser, EventSourceMessage } from 'eventsource-parser';

// async function fetchTryonTask(page: Page, clothingPath: string) {
//   const url = "https://www.genspark.ai/api/spark/tryon_running_tasks?task_source=FASHION_TRYON"
//   const resp = await page.goto(url, { waitUntil: 'domcontentloaded' })
//   const body = await resp?.json()
//   // const content = await page.locator("pre").textContent()
//   // const data = JSON.parse(content!).data
//   const data = body.data
//   const task = body.data.running_tasks.find((task: any) => {
//     if (task.additional_info.model_image_url === clothingPath) {
//       return true
//     }
//   })
//   if (!task.id) {
//     log("未找到对应的任务，当前任务为:", data.running_tasks)
//     return null
//   }
//   return task.id
// }

async function fetchTryOnResult(page: Page, clothingPath: string) {
  // // 先获取任务 id
  // const taskId = await fetchTryonTask(page, clothingPath)
  // log("获取到任务:", taskId)

  const url = 'https://www.genspark.ai/fashion/stylist'
  await page.goto(url, { waitUntil: 'load' })

  // TODO 从 remixing-progress获取进度信息
  // TODO 可能有多个image-generated
  const src = await retry(async () => {
    const imgEl = await page.waitForSelector("div.image-generated > .image-grid > img", { timeout: 60 * 1000 })
    return await imgEl.getAttribute('src')
  }, { maxRetries: 5, backoff: 3000 })

  if (src) {
    log('获取到图片:', src)
    return src
  }
  return null
}

async function uploadPhoto(page: Page, photoId: string): Promise<string | null> {
  log("打开模特照片上传页面")
  await page.goto(photoUploadUrl, {waitUntil: 'load'});

  const photoPath = await getUploadFilePath(photoId)
  if (!photoPath) {
    throw new Error("未找到照片文件: " + photoId)
  }

  log("开始上传模特照片")
  return await retry(async () => {
    try {
      log("选择模特照片 %s", photoId)
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
      throw new Error("照片上传失败, new_src=" + new_src)
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
  await page.goto(clothingUploadUrl, {waitUntil: "load"});

  const clothingPath = await getUploadFilePath(clothFileId)
  if (!clothingPath) {
    throw new Error("未找到服装文件: " + clothFileId)
  }

  return await retry(async () => {
    try {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 5000 }),
        page.click("css=.relative>div.cursor-pointer", {timeout:5000})
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
      await page.click('.try-on-button')
      // 等一会让点击事件响应
      await page.waitForTimeout(3000);
      await page.waitForURL("https://www.genspark.ai/fashion/stylist", { waitUntil: "domcontentloaded" })
      // await page.waitForLoadState();
      log('试穿跳转成功');
      return cloth_src
    } catch (err) {
      log('上传或跳转失败，刷新重试...', err);
      await page.reload();
      throw err
    }
  })
}

async function saveResultImage(page: Page, imageUrl: string): Promise<ITryonCompositedFile> {
  const imageResp = await page.evaluate(async (url: string) => {
    const res = await fetch(url);
    // console.log(res.headers.get("content-type"))
    const buf = await res.arrayBuffer();
    return Array.from(new Uint8Array(buf));
  }, imageUrl);

  // 生成结果文件名
  // TODO 可能不是 png 文件
  const fileName = `${uuidv4()}.png`;
  const realPath = await saveComposedFile(fileName, Buffer.from(imageResp))
  log('结果图片保存成功:', realPath);

  const fileUrl = await getComposedFileUrl(fileName)
  return {
    // filePath: realPath,
    fileId: fileName,
    fileUrl: fileUrl,
  }
}


// https://www.genspark.ai/fashion/target?id=60f3dd9fe107ad62fde489b7a525bed6&pr=1&from=tryon
export async function* compositeImage(params: {
  modelFileId: string;
  clothFileId: string;
}): AsyncGenerator<ITryonProgess<ITryonCompositedFile>> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled', // 尝试规避自动化检测
    ]
   });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: USER_AGENT
  });

  let stage: ITryonProgess<string>['stage'] = 'initial';

  const page = await context.newPage();
  try {
    yield {
      stage: stage,
      status: 'running',
      progress: 0,
      message: '正在准备模型...'
    }

    await pw_ensureLoggedIn(page)

    yield {
      stage: (stage = 'model_composing'),
      status: 'running',
      progress:  10,
      message: '正在处理模特照片...'
    }
    const model_src = await uploadPhoto(page, params.modelFileId)
    if (!model_src) {
      throw new Error("模特照片上传失败");
    }


    yield {
      stage: (stage = 'cloth_composing'),
      status: 'running',
      progress: 20,
      message: '正在处理服装照片...'
    }
    const cloth_src = await uploadClothing(page, params.clothFileId)
    if (!cloth_src) {
      throw new Error("服装照片上传失败");
    }

    yield {
      stage: (stage = 'image_generating'),
      status: 'running',
      progress: 40,
      message: '正在合成换装图片...'
    }
    const img = await fetchTryOnResult(page, cloth_src);
    if (img) {
      yield {
        stage: (stage = 'image_saving'),
        status: 'running',
        progress: 90,
        message: '正在保存换装图片...'
      }
      const imageFile = await saveResultImage(page, img)
      yield {
        stage: (stage = 'done'),
        status: 'completed',
        progress: 100,
        message: '换装成功！',
        result: imageFile
      }
    }
    else {
      yield {
        stage: (stage = 'done'),
        status: 'failed',
        // progress: 100,
        message: '换装失败！',
        error: '无法获取结果图片'
      }
    }
  } catch (error: any) {
    log("composite image error:", error)
    yield {
      stage: stage,
      status: 'failed',
      progress: 100,
      message: error.message
    }
    if (process.env.NODE_ENV === 'development') {
      await page.waitForTimeout(60000);
    }
  } finally {
    // log("closing in 5s");
    await page.close()
    await context.close();
    await browser.close();
  }
}

// import { sleep } from '@/server/utils/proc';
// async function* run() {
//   await sleep(1000);
//   yield { status: "running" }
//   await sleep(1000);
//   yield { status: "completed"}
// }

// async function main() {
//   for await (const progress of compositeImage({
//     modelFileId: '335200fe-554c-4294-a6de-842b2aeaddb0.jpg',
//     clothFileId:'4df53e08-cb46-40b1-9a5e-92b32ed4dd4c.webp'})
//   ) {
//       console.log(progress);
//     }
// }

// main().catch(console.error);
