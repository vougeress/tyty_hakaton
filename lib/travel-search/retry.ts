import "server-only";

export type RetryOptions = {
  attempts: number;
  timeoutMs: number;
  retryDelayMs: number;
};

export async function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = windowlessSetTimeout(() => controller.abort(), timeoutMs);
  try {
    return await work(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

export async function retry<T>(work: (signal: AbortSignal) => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await withTimeout(work, options.timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt === options.attempts) break;
      await sleep(options.retryDelayMs * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function windowlessSetTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}
