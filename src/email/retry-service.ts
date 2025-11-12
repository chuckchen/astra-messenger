/**
 * Retry Service
 *
 * Handles retry logic with exponential backoff for failed email deliveries.
 */

export interface RetryConfig {
	baseDelaySeconds: number;
	maxRetries: number;
	jitterMaxSeconds: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	baseDelaySeconds: 30,
	maxRetries: 3,
	jitterMaxSeconds: 10,
};

/**
 * Calculate the next retry time using exponential backoff with jitter
 *
 * Formula: delay = baseDelay * (2 ^ attemptNumber) + randomJitter
 * Example progression:
 * - Attempt 1: 30s + jitter
 * - Attempt 2: 60s + jitter
 * - Attempt 3: 120s + jitter
 * - Attempt 4: 240s + jitter
 *
 * @param attemptNumber - Current retry attempt (0-indexed)
 * @param config - Retry configuration
 * @returns Date object for the next retry time
 */
export function calculateNextRetryTime(attemptNumber: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): Date {
	const { baseDelaySeconds, jitterMaxSeconds } = config;

	// Calculate exponential backoff
	const exponentialDelay = baseDelaySeconds * Math.pow(2, attemptNumber);

	// Add random jitter to prevent thundering herd
	const jitter = Math.random() * jitterMaxSeconds;

	// Total delay in seconds
	const totalDelaySeconds = exponentialDelay + jitter;

	// Calculate future timestamp
	const nextRetryTime = new Date();
	nextRetryTime.setSeconds(nextRetryTime.getSeconds() + totalDelaySeconds);

	return nextRetryTime;
}

/**
 * Check if a message should be retried based on attempts and max retries
 *
 * @param attempts - Number of attempts made so far
 * @param maxAttempts - Maximum allowed attempts
 * @returns true if the message should be retried
 */
export function shouldRetry(attempts: number, maxAttempts: number): boolean {
	return attempts < maxAttempts;
}

/**
 * Classify error codes to determine if they are retriable
 *
 * Transient errors (retriable):
 * - 429: Rate limit exceeded
 * - 500, 502, 503, 504: Server errors
 * - Network timeouts
 * - Provider API downtime
 *
 * Permanent errors (not retriable):
 * - 400: Bad request (invalid data)
 * - 401, 403: Authentication/authorization errors
 * - 404: Resource not found
 * - 422: Validation error (invalid email address, etc.)
 *
 * @param statusCode - HTTP status code from provider
 * @param errorMessage - Error message from provider
 * @returns true if the error is transient and should be retried
 */
export function isRetriableError(statusCode: number, errorMessage?: string): boolean {
	// Transient server errors
	if (statusCode === 429 || statusCode >= 500) {
		return true;
	}

	// Check for network-related errors in message
	if (errorMessage) {
		const lowerMessage = errorMessage.toLowerCase();
		const networkErrors = ['timeout', 'econnrefused', 'econnreset', 'network', 'socket', 'etimedout'];

		if (networkErrors.some((err) => lowerMessage.includes(err))) {
			return true;
		}
	}

	// Permanent errors - do not retry
	if (statusCode === 400 || statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 422) {
		return false;
	}

	// Default to not retrying for unknown errors
	return false;
}

/**
 * Format retry information for logging
 *
 * @param attempts - Current attempt number
 * @param maxAttempts - Maximum attempts allowed
 * @param nextRetryAt - Next retry timestamp
 * @returns Formatted string for logging
 */
export function formatRetryInfo(attempts: number, maxAttempts: number, nextRetryAt?: Date): string {
	if (!nextRetryAt) {
		return `Attempt ${attempts}/${maxAttempts} - No retry scheduled`;
	}

	const now = new Date();
	const delaySeconds = Math.round((nextRetryAt.getTime() - now.getTime()) / 1000);

	return `Attempt ${attempts}/${maxAttempts} - Next retry in ${delaySeconds}s (${nextRetryAt.toISOString()})`;
}
