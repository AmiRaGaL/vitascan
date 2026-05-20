import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, RateLimitEntry>();

  enforce(
    bucket: string,
    identifier: string,
    options: { limit: number; windowMs: number },
  ) {
    const now = Date.now();
    const key = `${bucket}:${identifier}`;
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return;
    }

    if (current.count >= options.limit) {
      throw new HttpException(
        'Too many requests. Please wait a moment and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
  }
}
