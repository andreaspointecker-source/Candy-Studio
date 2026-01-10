const DEFAULTS = {
  maxAttempts: Number.POSITIVE_INFINITY,
  baseDelayMs: 1500,
  maxDelayMs: 60000,
  cooldownSeconds: 45,
};

function isRateLimit(error: unknown) {
  const err = error as { status?: number; message?: string; headers?: Record<string, string> };
  if (!err) return false;
  if (err.status === 429) return true;
  const message = (err.message ?? "").toLowerCase();
  return message.includes("rate limit") || message.includes("quota");
}

function isRetryable(error: unknown) {
  const err = error as { status?: number; message?: string };
  if (!err) return false;
  if (err.status && [408, 429, 500, 502, 503, 504].includes(err.status)) return true;
  const message = (err.message ?? "").toLowerCase();
  return (
    message.includes("try again") ||
    message.includes("temporarily") ||
    message.includes("rate limit") ||
    message.includes("quota")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: Partial<typeof DEFAULTS>
) {
  const config = { ...DEFAULTS, ...options };
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt >= config.maxAttempts || !isRetryable(error)) {
        throw error;
      }
      const err = error as { headers?: Record<string, string> };
      const retryAfterRaw = err.headers?.["retry-after"];
      const retryAfter = retryAfterRaw ? Number(retryAfterRaw) * 1000 : undefined;
      const jitter = Math.round(Math.random() * 400);
      let delay = retryAfter ?? config.baseDelayMs * Math.pow(2, attempt - 1) + jitter;
      if (isRateLimit(error)) {
        delay = Math.max(delay, config.cooldownSeconds * 1000);
      }
      delay = Math.min(config.maxDelayMs, delay);
      await sleep(delay);
    }
  }
}
