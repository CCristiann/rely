import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Unix timestamp (seconds) when the window resets for this identifier. */
  reset: number;
}

// Cache limiter instances keyed by "limit:windowSec" to avoid recreating them
// on every request (each instance holds no mutable state).
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const windowSec = Math.ceil(windowMs / 1000);
  const key = `${limit}:${windowSec}`;
  if (!limiters.has(key)) {
    limiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
        prefix: "rely:ratelimit",
      })
    );
  }
  return limiters.get(key)!;
}

/**
 * Distributed sliding-window rate limiter backed by Upstash Redis.
 * Safe for multi-instance deployments (Vercel, Docker, etc.).
 *
 * @example
 * const rl = await rateLimit(`chat:${userId}`, { limit: 20, windowMs: 60_000 });
 * if (!rl.success) return 429;
 */
export async function rateLimit(
  identifier: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  const limiter = getLimiter(limit, windowMs);
  const { success, remaining, reset } = await limiter.limit(identifier);
  return {
    success,
    remaining,
    // Upstash returns reset as a Unix timestamp in milliseconds; convert to seconds
    reset: Math.ceil(reset / 1000),
  };
}
