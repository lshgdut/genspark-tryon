import { chromium } from 'playwright';
import { type Page, type Locator } from 'playwright';

import { v4 as uuidv4 } from 'uuid';
import debug from 'debug';

import { ITryonProgess, ITryonCompositedFile } from '@/types/tryon';
import {
  saveComposedFile,
  getComposedFileUrl,
  getComposedFilePath,
  pw_ensureLoggedIn,
} from './_utils';


const log = debug('tryon:generate-video');

const videoPageUrl = 'https://www.genspark.ai/agents?type=moa_generate_video';

async function chooseModel(page: Page) {
  const model = 'Kling V1.6 Pro'
  // const model = 'Kling V2.1 Master'

  log("选择模型: ", model)
  const wrapperEl = await page.waitForSelector('div.models-wrapper')
  await wrapperEl.click()
  await page.waitForTimeout(2000)

  log("点击模型: ", model)
  await page.waitForSelector('.models-list')
  const modelOption = await page.locator('div.models-list > .model', { hasText: model })
  await modelOption.click()
  await page.waitForTimeout(1000)
}

async function chooseRatio(page: Page) {
  const ratio = '16:9'
  // const ratio = '1:1'

  log("选择比例: ", ratio)
  const selectorEl = await page.locator("div.options-wrapper > .models-selected", { hasText: ':' })
  await selectorEl.click()
  await page.waitForTimeout(1000)

  log("点击比例：", ratio)
  await page.waitForSelector('div.models-list')
  const ratioOption = await page.locator('div.models-list > .model', { hasText: ratio })
  await ratioOption.click()
}

async function chooseDuration(page: Page) {
  const duration = '3 ~ 5s'
  log("选择时长: %s", duration)
  const selectorEl = await page.locator("div.options-wrapper > .models-selected", { hasText: '~' })
  await selectorEl.click()
  await page.waitForTimeout(1000)

  log("点击时长：%s", duration)
  await page.waitForSelector('div.models-list')
  await page.locator('div.models-list > .model', { hasText: duration }).click()
}

async function uploadTryonImage(page: Page, fileId: string) {
  log("上传试穿图片: %s", fileId)
  await page.locator("div.remix-dropdown-container").click()

  // await page.waitForSelector("div.media-gallery-container")
  // await page.click("div.media-gallery-container .upload-button")

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5000 }),
    page.locator("div.media-gallery-container .upload-button").click(),
  ]);

  const tryonSourcePath = await getComposedFilePath(fileId)
  log("试穿图片正在上传")
  await fileChooser.setFiles(tryonSourcePath);

  // 等图片就绪
  await page.waitForSelector("div.input-wrapper .prompt-files img")
}

async function fillPrompt(page: Page) {
  const prompt = `基于这张图片生成一段走秀视频 ，需要完整的服装画面，人物要走动起来 ，只要正面 ，正面向前走， 高清画质`

  log("填充提示词:", prompt)
  await page.locator("div.input-wrapper textarea[name='query']").fill(prompt)
}

async function postVideoCreated(page: Page, onProgress?: (progress: number) => void) {
  log("提交生成视频")
  await page.locator(".textarea-wrapper > .icon-group").click()
  await page.waitForTimeout(1000)

  // await page.waitForSelector("div.generated-videos")
  let progressEl, progress: string = ''
  do {
    try {
      progressEl = await page.$("div.generated-videos .generating-progress .progress-text")
      if (!progressEl) {
        if (progress) {
          log("视频生成成功...")
          break
        }
        else {
          log("准备生成视频...")
          await page.waitForTimeout(3000)
          continue
        }
      }
      progress = await progressEl.textContent() || ''
      try {
        onProgress?.(parseInt(progress.replace("%", ""), 10) / 100)
      } catch (error) {
        log("获取进度失败: %s, %s", error, progress)
      }
      if (progress) {
        log("生成进度:", progress)
        if (progress === "100%") {
          break
        }
        await page.waitForTimeout(3000)
      }
    } catch (error) {
      log("视频生成失败...")
      // TODO
      /**
          TimeoutError: content: Timeout 30000ms exceeded.
          Call log:
          - waiting for locator('div.generated-videos .generating-progress .progress-text')
       */
      throw error
    }
  } while (true)

  const videoEl = page.locator("div.generated-videos video.preview-video")
  const src = await videoEl.getAttribute("src")
  if (src) {
    log("获取到视频:", src)
    return src
  }
  return null
}

async function saveVideoGenerated(page: Page, videoUrl: string) {
  const videoResp = await page.evaluate(async (url: string) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    return Array.from(new Uint8Array(buf));
  }, videoUrl);

  // 生成结果文件名
  // TODO 可能不是 png 文件
  const fileName = `${uuidv4()}.mp4`;
  const realPath = await saveComposedFile(fileName, Buffer.from(videoResp))
  log('结果视频保存成功:', realPath);

  const fileUrl = await getComposedFileUrl(fileName)
  return {
    // filePath: realPath,
    fileId: fileName,
    fileUrl: fileUrl,
  }
}


// https://www.genspark.ai/fashion/target?id=60f3dd9fe107ad62fde489b7a525bed6&pr=1&from=tryon
export async function* compositeVideo({fileId}: {fileId: string}): AsyncGenerator<ITryonProgess<ITryonCompositedFile>> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled', // 尝试规避自动化检测
    ]
  }); // 设置 headless 为 false 可以看到浏览器界面

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  let stage: ITryonProgess<string>['stage'] = 'initial';

  try {
    yield {
      stage: stage,
      status: 'pendding',
      progress: 0,
      message: '正在准备模型...'
    }

    await pw_ensureLoggedIn(page)

    log("打开页面:", videoPageUrl)
    await page.goto(videoPageUrl, { waitUntil: "domcontentloaded" })
    // TODO TimeoutError: goto: Timeout 30000ms exceeded.

    yield {
      stage: (stage = 'video_generating'),
      status: 'running',
      progress: 10,
      message: '正在处理视频参数...'
    }
    await chooseModel(page)
    // 暂停 1s，等模型浮窗关闭
    await page.waitForTimeout(1000)

    await chooseRatio(page)
    // 暂停 1s，等比例浮窗关闭
    await page.waitForTimeout(1000)

    await chooseDuration(page)
    // 暂停 1s，等时长浮窗关闭
    await page.waitForTimeout(1000)

    await uploadTryonImage(page, fileId)
    // 暂停 1s，等图片就绪
    await page.waitForTimeout(1000)

    await fillPrompt(page)

    yield {
      stage: (stage = 'video_generating'),
      status: 'running',
      progress: 20,
      message: '正在生成换装视频...'
    }
    const videoUrl = await postVideoCreated(page)
    if (videoUrl) {

      yield {
        stage: (stage = 'image_saving'),
        status: 'running',
        progress: 90,
        message: '正在保存换装视频...'
      }
      const videoFile = await saveVideoGenerated(page, videoUrl)

      yield {
        stage: (stage = 'done'),
        status: 'completed',
        progress: 100,
        message: '换装成功！',
        result: videoFile
      }
      log("视频生成完成")
    }
    else {
      yield {
        stage: (stage = 'done'),
        status: 'failed',
        // progress: 100,
        message: '换装失败！',
        error: '无法获取生成视频'
      }
    }
  } catch (error:any) {
    log("composite video error:", error)
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
    await page.close();
    await context.close();
    await browser.close();
  }
}

// async function main() {
//   for await (const progress of compositeVideo({
//     fileId: 'e7f49a77-4fa5-40c9-a3da-43a411b7fc55.png'
//   })
//   ) {
//       console.log(progress);
//     }
// }

// main().catch(console.error);
