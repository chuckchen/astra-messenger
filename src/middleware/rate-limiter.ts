import { Context, Next } from 'hono';

import { RATE_LIMIT_CONFIG } from '../config';

// Token bucket rate limiter configuration
export interface RateLimiterConfig {
	capacity: number; // Token bucket capacity
	refillRate: number; // Token refill rate (per second)
	tokenAmount: number; // Tokens consumed per request
}

export class TokenBucket {
	private tokens: number;
	private lastRefillTimestamp: number;
	private readonly config: RateLimiterConfig;

	constructor(config: RateLimiterConfig) {
		this.tokens = config.capacity;
		this.lastRefillTimestamp = Date.now();
		this.config = config;
	}

	refill() {
		const now = Date.now();
		const timePassed = (now - this.lastRefillTimestamp) / 1000; // Convert to seconds
		const tokensToAdd = timePassed * this.config.refillRate;

		this.tokens = Math.min(this.config.capacity, this.tokens + tokensToAdd);
		this.lastRefillTimestamp = now;
	}

	tryConsume(tokens: number): boolean {
		this.refill();

		if (this.tokens >= tokens) {
			this.tokens -= tokens;
			return true;
		}

		return false;
	}
}

// Create global token bucket instance
export const globalBucket = new TokenBucket({
	capacity: RATE_LIMIT_CONFIG.capacity,
	refillRate: RATE_LIMIT_CONFIG.refillRate,
	tokenAmount: 1, // Each request consumes 1 token
});

// Rate limiter middleware

export const rateLimiter = async (c: Context, next: Next) => {
	if (!globalBucket.tryConsume(1)) {
		c.status(429);
		return c.json({
			success: false,
			code: 429,
			message: 'Too Many Requests',
		});
	}

	await next();
};
