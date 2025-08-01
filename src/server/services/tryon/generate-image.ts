import playwright, { chromium } from 'playwright';
import type { Page } from 'playwright';
const PW_TimeoutError = playwright.errors.TimeoutError;
import { v4 as uuidv4 } from 'uuid';
import debug from 'debug';

import { retry, StopRetry } from '@/server/utils/proc';
import { getUploadFilePath } from '@/libs/upload-utils'
import {
  saveComposedFile,
  getComposedFileUrl,
  pw_ensureLoggedIn,
  USER_AGENT,
} from './_utils';


import { ITryonProgess, ITryonCompositedFile } from '@/types/tryon';
import { gensparkEnv } from '@/config/genspark';

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
    const imgEl = await page.waitForSelector("div.image-generated > .image-grid > img")
    return await imgEl.getAttribute('src')
  }, { maxRetries: 5, backoff: 3000 })

  if (src) {
    log('获取到图片:', src)
    return src
  }
  return null
}

async function uploadPhoto(page: Page, photoId: string): Promise<string | null> {
  log("打开模特照片上传页面: %s", photoUploadUrl)
  await page.goto(photoUploadUrl, {waitUntil: 'load'});

  const photoPath = await getUploadFilePath(photoId)
  if (!photoPath) {
    throw new Error("未找到照片文件: " + photoId)
  }

  log("开始上传模特照片")
  return await retry(async () => {
    try {
      log("选择模特照片 %s", photoId)
      // const previousSrc = await page.locator("img.preview-image").getAttribute('src')

      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('css=div.add-new-photo'),
      ]);

      await fileChooser.setFiles(photoPath);
      log("模特照片上传中")

      const modelPromise = page.waitForResponse(response =>
        response.url().startsWith("https://gensparkstorageprodwest.blob.core.windows.net") && response.request().method() === 'PUT'
      );

      const modelResp = await modelPromise
      if (modelResp.status() != 201) {
        log("模特照片上传失败, status: %s", modelResp.status())
        throw Error("模特照片上传失败")
      }

      // 等 3s 让模特图片渲染出来
      await page.waitForTimeout(3000)
      const modelSrc = await page.locator("img.preview-image").getAttribute("src")

      log('模特照片上传成功:', modelSrc);
      return modelSrc

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
  log("打开上传服装页面: %s", clothingUploadUrl)
  await page.goto(clothingUploadUrl, {waitUntil: "load",timeout:3 * 60 * 1000 });

  const clothingPath = await getUploadFilePath(clothFileId)
  if (!clothingPath) {
    throw new Error("未找到服装文件: " + clothFileId)
  }

  // let cloth_src
  let has_try = false

  return await retry(async ()=>{

    if (has_try) {
      await page.reload({waitUntil: "load"});
    }

    has_try = true
    log("开始上传服装")
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click("css=.relative>div.cursor-pointer")
    ]);

    log("设置服装文件")
    await fileChooser.setFiles(clothingPath);

    log("服装正在上传")
    const imgEl = await page.waitForSelector("img[alt='uploadImageUrl']")
    const cloth_src = await imgEl.getAttribute('src')
    log('服装上传成功:', cloth_src);

    // 有概率点击后不会生效，暂时使用等待 3s 来规避
    await page.waitForTimeout(3000)
    const tryonPromise = page.waitForResponse(response =>
      response.url() === 'https://www.genspark.ai/api/try_on' && response.request().method() === 'POST'
     );

    log("准备提交换装")
    await page.locator('css=div.try-on-button', { hasNot: page.locator('css=div.opacity-50') }).click()

    log("等待换装请求响应")
    const tryonResp = await tryonPromise
    if (tryonResp.status() != 200) {
      throw StopRetry("请求换装超时，请稍后重试")
    }
    const tryonData = await tryonResp.json();
    if (tryonData.status != 0) {
      log("换装服务异常, status: %s, message: %s", tryonData.status, tryonData.message)
      throw StopRetry("请求换装失败: " + tryonData.message)
    }

    log('换穿提交成功');

    return cloth_src
  }, { maxRetries: 10, backoff: 1000 })

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
    headless: gensparkEnv.playwright_headless,
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
  log("timeout >>> %s", gensparkEnv.playwright_page_navigation_timeout)
  page.setDefaultNavigationTimeout(gensparkEnv.playwright_page_navigation_timeout)
  page.setDefaultTimeout(1 * 60 * 1000)

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
        stage: (stage = 'error'),
        status: 'failed',
        // progress: 100,
        message: '换装失败: 无法获取结果图片',
      }
    }
  } catch (error: any) {
    if (error instanceof PW_TimeoutError) {
      // 截图并保存
      // await page.screenshot({
      //   path: path.resolve(process.cwd(), 'screenshot.png'),
      //   fullPage: true,
      // });
      log("页面打开超时：%s, %s", page.url(), error.message)
      throw new Error("换装失败: 请求服务器超时")
    }
    log("composite image error:", error)
    throw error
    // if (process.env.NODE_ENV === 'development') {
    //   await page.waitForTimeout(60000);
    // }
  } finally {
    // log("closing in 5s");
    await page.close()
    await context.close();
    await browser.close();
  }
}

// import { sleep } from '@/server/utils/proc';
// async function main() {


//   async function* run() {
//     await sleep(1000);
//     yield { status: "running" }
//     throw new Error("error")
//     await sleep(1000);
//     yield { status: "completed"}
//   }

//   for await (const progress of run()) {
//     console.log(progress);
//   }

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
