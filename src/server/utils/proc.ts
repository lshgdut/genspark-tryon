import debug from "debug";

const log = debug('proc:proc');

export const sleep = async (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const retry = async (callback: Function, { maxRetries = 3, backoff = 1000 } = {}) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await callback();
    } catch (e) {
      retries++;
      await sleep(backoff);
      log(`重试第 ${retries} 次`);
    }
  }
  throw new Error(`重试失败，已尝试 ${maxRetries} 次`);
}
