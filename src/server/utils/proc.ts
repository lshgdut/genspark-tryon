import debug from "debug";

const log = debug('proc:proc');

export const sleep = async (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const StopRetry = Error

export const retry = async <T>(callback: ()=>T, { maxRetries = 3, backoff = 1000 } = {}) => {
  let retries = 0;
  let lastError;
  while (retries < maxRetries) {
    try {
      return await callback();
    } catch (err) {
      if (err instanceof StopRetry) {
        throw err
      }
      retries++;
      await sleep(backoff);
      log(`重试第 ${retries} 次, ${(err as Error).message}`);
      lastError = err;
    }
  }
  log(`重试失败，已尝试 ${maxRetries} 次`);
  throw lastError;
}
