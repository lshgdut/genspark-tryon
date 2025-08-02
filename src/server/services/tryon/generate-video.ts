import playwright, { chromium } from 'playwright';
import type { Page } from 'playwright';
const PW_TimeoutError = playwright.errors.TimeoutError;

import { basename } from 'node:path';
import debug from 'debug';

import { ITryonProgess, ITryonCompositedFile } from '@/types/tryon';
import {
  USER_AGENT,
  getComposedFileUrl,
  getComposedFilePath,
  pw_ensureLoggedIn,
  pw_downloadFileStream,
} from './_utils';

import { gensparkEnv } from '@/config/genspark';

const log = debug('tryon:generate-video');

const videoPageUrl = 'https://www.genspark.ai/agents?type=moa_generate_video';

async function chooseModel(page: Page) {
  const model = gensparkEnv.video_model || 'Kling V1.6 Pro'
  // const model = 'Kling V2.1 Master'

  log("选择模型: ", model)
  const wrapperEl = await page.waitForSelector('div.models-wrapper')
  await wrapperEl.click()
  await page.waitForTimeout(2000)

  log("点击模型: ", model)
  await page.waitForSelector('.models-list')
  const modelOption = await page.locator('div.models-list > .model', { hasText: model })
  await modelOption.click({force: true})
  await page.waitForTimeout(1000)
}

async function chooseRatio(page: Page) {
  const ratio = gensparkEnv.video_ratio || '9:16'
  // const ratio = '1:1'

  log("选择比例: ", ratio)
  const selectorEl = await page.locator("div.options-wrapper > .models-selected", { hasText: ':' })
  await selectorEl.click()
  await page.waitForTimeout(1000)

  log("点击比例：", ratio)
  await page.waitForSelector('div.models-list')
  const ratioOption = await page.locator('div.models-list > .model', { hasText: ratio })
  await ratioOption.click({force: true})
}

async function chooseDuration(page: Page) {
  const duration = gensparkEnv.video_duration || '5 ~ 10s'
  log("选择时长: %s", duration)
  const selectorEl = await page.locator("div.options-wrapper > .models-selected", { hasText: '~' })
  await selectorEl.click()
  await page.waitForTimeout(1000)

  log("点击时长：%s", duration)
  await page.waitForSelector('div.models-list')


  const optionEl = page.locator('div.models-list > .model', { hasText: duration, has: page.locator('.plus-icon-paid') })
  if ((await optionEl.filter({ has: page.locator('.plus-icon-hidden')}).count()) > 0) {
    await optionEl.click({ force: true })
  }else{
    throw new Error("账户积分不足，请充值")
  }

  // const popupPromise = page.waitForEvent('popup', { timeout: 5000 })
  // const popupUrl = await (await popupPromise).evaluate('location.href')
  // if (popupUrl === 'https://www.genspark.ai/pricing') {
  //   throw new Error("账户积分不足，请充值")
  // }
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

async function postVideoCreated(page: Page) {
  log("提交生成视频")
  await page.locator(".textarea-wrapper > .icon-group").click()
  await page.waitForTimeout(1000)
}

async function* waitForVideoProgress(page: Page): AsyncGenerator<string> {
  // await page.waitForSelector("div.generated-videos")
  let progressEl, progress: string = '', retryCount = 0, maxRetries=60
  do {
    progressEl = await page.$("div.generated-videos .generating-progress .progress-text")
    if (!progressEl) {
      if (progress) {
        log("视频生成成功...")
        break
      }
      else {
        log("准备生成视频...")
        await page.waitForTimeout(3000)
        retryCount++
        continue
      }
    }
    progress = await progressEl.textContent() || ''
    log("生成进度:", progress)
    if (progress) {
      yield progress
      await page.waitForTimeout(3000)
    }
  } while (retryCount < maxRetries)

  if (retryCount >= maxRetries) {
    throw new Error("视频生成超时，请稍后重试")
  }
}

async function getGeneratedVideoUrl(page: Page): Promise<string> {
  const videoEl = page.locator("div.generated-videos video.preview-video")
  const src = await videoEl.getAttribute("src")
  if (src) {
    log("获取到视频:", src)
    return src
  }
  throw new Error("视频生成失败");
}

async function saveVideoGenerated(page: Page, videoUrl: string) {
  // const videoResp = await page.evaluate(async (url: string) => {
  //   const res = await fetch(url);
  //   const buf = await res.arrayBuffer();
  //   return Array.from(new Uint8Array(buf));
  // }, videoUrl);

  // const [download, _] = await Promise.all([
  //   page.waitForEvent('download'),
  //   page.click('css=.download-icon-container')
  // ]);
  // const fileName = `${uuidv4()}.mp4`;
  // await download.saveAs(`./${fileName}`);

  // 生成结果文件名
  // TODO 可能不是 png 文件
  const filePath = await pw_downloadFileStream(videoUrl)
  const fileName = basename(filePath)
  log('结果视频保存成功:', filePath);

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
    headless: gensparkEnv.playwright_headless,
    args: [
      '--disable-blink-features=AutomationControlled', // 尝试规避自动化检测
    ]
  }); // 设置 headless 为 false 可以看到浏览器界面

  const context = await browser.newContext({
    viewport: { width: 1440, height: 860 },
    userAgent: USER_AGENT,
  });

  const page = await context.newPage();
  page.setDefaultNavigationTimeout(gensparkEnv.playwright_page_navigation_timeout)
  page.setDefaultTimeout(1 * 60 * 1000)

  let stage: ITryonProgess<string>['stage'] = 'initial';

  try {
    yield {
      stage: stage,
      status: 'pending',
      progress: 0,
      message: '正在准备模型...'
    }

    await pw_ensureLoggedIn(page)

    log("打开页面:", videoPageUrl)
    await page.goto(videoPageUrl, { waitUntil: "load" })
    // 等 3s 页面稳定
    await page.waitForTimeout(3000)
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

    await postVideoCreated(page)
    for await (const progress of waitForVideoProgress(page)){
      yield {
        stage: (stage = 'video_generating'),
        status: 'running',
        progress: 20 + Math.floor((100 - 20) * ((parseInt(progress.replace("%", ""), 10) / 100))),
        message: '正在生成换装视频...'
      }
      if (progress === '100%') {
        log("换装视频生成完成")
        break
      }
    }
    const videoUrl = await getGeneratedVideoUrl(page)
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
        message: '换装视频生成成功！',
        result: videoFile
      }
      log("视频生成流程结束")
    }
    else {
      yield {
        stage: (stage = 'error'),
        status: 'failed',
        // progress: 100,
        message: '视频生成失败: 无法获取生成视频',
      }
    }
  } catch (error: any) {
    log("composite image error:", error)

    if (error instanceof PW_TimeoutError) {
      // 截图并保存
      // await page.screenshot({
      //   path: path.resolve(process.cwd(), 'screenshot.png'),
      //   fullPage: true,
      // });
      log("页面打开超时：%s", page.url())
      throw new Error("换装失败: 请求服务器超时")
    }
    throw error
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
