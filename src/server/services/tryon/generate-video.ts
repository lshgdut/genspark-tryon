import * as fs from 'node:fs';

import { chromium } from 'playwright';
import { type Page, type Locator } from 'playwright';

const cred_email = 'ppacsedd888@outlook.com';
const cred_password = 'ZHUnin2025f8af8af8a';

const videoPageUrl = 'https://www.genspark.ai/agents?type=moa_generate_video';

const tryonSourcePath = '/Users/wenhua/develop/qinglin/redbird/download/d1.jpg';
const videoOutputPath = '/Users/wenhua/develop/qinglin/redbird/download/d1.mp4';

async function check_user(page: Page): Promise<boolean> {
    const url = 'https://www.genspark.ai/api/user'
    const resp = await page.goto(url)
    const body = await resp?.json()

    if (body.status != 0) {
        console.log("未登录，需要重新登录")
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
        console.log('未登录，开始登录...');
        await page.goto('https://www.genspark.ai/api/login?redirect_url=%2F');

        await page.click("#loginWithEmailWrapper")
        await page.locator('#email').fill(cred_email);
        await page.locator('input[type="password"]').fill(cred_password);
        await page.click('button[type="submit"]')

        // await page.waitForTimeout(3000);
        await page.waitForURL("https://www.genspark.ai/**", { waitUntil: 'commit' })
        console.log('登录成功，重新加载页面');
    } catch (e) {
        console.log('登录失败 ', e);
    }
}

async function chooseModel(page: Page) {
    const model = 'Kling V1.6 Pro'
    // const model = 'Kling V2.1 Master'

    console.log("选择模型: ", model)
    const wrapperEl = await page.waitForSelector('div.models-wrapper')
    await wrapperEl.click()
    await page.waitForTimeout(2000)

    console.log("点击模型: ", model)
    await page.waitForSelector('.models-list')
    const modelOption = await page.locator('div.models-list > .model', { hasText: model })
    await modelOption.click()
    await page.waitForTimeout(1000)
}

async function chooseRatio(page: Page) {
    // const ratio = '16:9'
    const ratio = '1:1'

    console.log("选择比例: ", ratio)
    const selectorEl = await page.locator("div.options-wrapper > .models-selected", { hasText: ':' })
    await selectorEl.click()
    await page.waitForTimeout(1000)

    console.log("点击比例：", ratio)
    await page.waitForSelector('div.models-list')
    const ratioOption = await page.locator('div.models-list > .model', { hasText: ratio })
    await ratioOption.click()
}

async function chooseDuration(page: Page) {
    const duration = '3 ~ 5s'
    console.log("选择时长: ", duration)
    const selectorEl = await page.locator("div.options-wrapper > .models-selected", { hasText: '~' })
    await selectorEl.click()
    await page.waitForTimeout(1000)

    console.log("点击时长：", duration)
    await page.waitForSelector('div.models-list')
    await page.locator('div.models-list > .model', { hasText: duration }).click()
}

async function uploadTryonImage(page: Page) {
    console.log("上传试穿图片")
    await page.locator("div.remix-dropdown-container").click()

    // await page.waitForSelector("div.media-gallery-container")
    // await page.click("div.media-gallery-container .upload-button")

    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 5000 }),
        page.locator("div.media-gallery-container .upload-button").click(),
    ]);

    console.log("试穿图片正在上传")
    await fileChooser.setFiles(tryonSourcePath);

    // 等图片就绪
    await page.waitForSelector("div.input-wrapper .prompt-files img")
}

async function fillPrompt(page: Page) {
    const prompt = `基于这张图片生成一段走秀视频 ，需要完整的服装画面，人物要走动起来 ，只要正面 ，正面向前走， 高清画质`

    console.log("填充提示词:", prompt)
    await page.locator("div.input-wrapper textarea[name='query']").fill(prompt)
}

async function postVideoCreated(page: Page) {
    console.log("提交生成视频")
    await page.locator(".textarea-wrapper > .icon-group").click()
    await page.waitForTimeout(1000)

    // await page.waitForSelector("div.generated-videos")
    let progressEl: Locator, progress: string
    do {
        try {
            progressEl = page.locator("div.generated-videos .generating-progress .progress-text")
            progress = await progressEl.textContent() || ''
            if (progress) {
                console.log("生成进度:", progress)
                if (progress === "100%") {
                    break
                }
                await page.waitForTimeout(1000)
            }
        } catch (error) {
            console.log("视频生成完成...")
            // TODO
            /**
                TimeoutError: content: Timeout 30000ms exceeded.
                Call log:
                - waiting for locator('div.generated-videos .generating-progress .progress-text')
             */
            break
        }
    } while (true)

    const videoEl = page.locator("div.generated-videos video.preview-video")
    const src = await videoEl.getAttribute("src")
    if (src) {
        console.log("获取到视频:", src)
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

    fs.writeFileSync(videoOutputPath, Buffer.from(videoResp));
    console.log('结果视频保存成功：', videoOutputPath);
}


// https://www.genspark.ai/fashion/target?id=60f3dd9fe107ad62fde489b7a525bed6&pr=1&from=tryon
async function openUrl() {
    const browser = await chromium.launch({ headless: false }); // 设置 headless 为 false 可以看到浏览器界面
    const context = await browser.newContext();

    try {
        const page = await context.newPage();

        await ensureLoggedIn(page)

        console.log("打开页面:", videoPageUrl)
        await page.goto(videoPageUrl, { waitUntil: "domcontentloaded" })
        // TODO TimeoutError: goto: Timeout 30000ms exceeded.

        await chooseModel(page)
        // 暂停 1s，等模型浮窗关闭
        await page.waitForTimeout(1000)

        await chooseRatio(page)
        // 暂停 1s，等比例浮窗关闭
        await page.waitForTimeout(1000)

        await chooseDuration(page)
        // 暂停 1s，等时长浮窗关闭
        await page.waitForTimeout(1000)

        await uploadTryonImage(page)
        // 暂停 1s，等图片就绪
        await page.waitForTimeout(1000)

        await fillPrompt(page)

        const videoUrl = await postVideoCreated(page)
        if (videoUrl) {
            await saveVideoGenerated(page, videoUrl)
        }
        console.log("视频生成完成")
        // await page.waitForTimeout(60000);
    } catch (error) {
        console.log("error:", error)
    } finally {
        // console.log("closing in 5s");
        await context.close();
        await browser.close();
    }
}

async function main() {
    await openUrl();
    console.log('流程完成 ✅');
}

main().catch(console.error);