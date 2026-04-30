import { Injectable, Logger } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly limits = new Map<string, RateLimitEntry>();
  private readonly maxRequests = 100; // Max requests per window
  private readonly windowMs = 60 * 1000; // 1 minute window

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      // Reset or create new entry
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      this.logger.log(`[RATE-LIMIT] New window for ${identifier} — count: 1/${this.maxRequests}`);
      return false;
    }

    if (entry.count >= this.maxRequests) {
      this.logger.warn(`[RATE-LIMIT] EXCEEDED for ${identifier} — count: ${entry.count}/${this.maxRequests}, resets in ${Math.ceil((entry.resetTime - now) / 1000)}s`);
      return true;
    }

    entry.count++;
    this.logger.debug(`[RATE-LIMIT] ${identifier} — count: ${entry.count}/${this.maxRequests}`);
    return false;
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return Date.now() + this.windowMs;
    }
    return entry.resetTime;
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}