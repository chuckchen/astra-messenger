/**
 * Application Configuration
 *
 * Centralized configuration for all hardcoded values throughout the application.
 */

import type { RetryConfig } from './email/retry-service';
import type { EmailProvider } from './types';

/**
 * Email configuration
 */
export const EMAIL_CONFIG = {
	// Default sender email (used as fallback)
	DEFAULT_SENDER: 'noreply@yourdomain.com',

	// Default email provider
	DEFAULT_PROVIDER: 'mailersend' as EmailProvider,

	// Unsubscribe URL for list-unsubscribe header
	UNSUBSCRIBE_URL: 'https://pixels-ai.com/unsubscribe',
};

/**
 * Retry configuration for failed email deliveries
 */
export const RETRY_CONFIG: RetryConfig = {
	// Initial delay in seconds (doubles with each retry)
	baseDelaySeconds: 30,

	// Maximum number of retry attempts
	maxRetries: 3,

	// Maximum random jitter to add (prevents thundering herd)
	jitterMaxSeconds: 10,
};

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
	// Maximum requests allowed per window
	capacity: 100,

	// Refill rate (requests per second)
	refillRate: 10,
};

/**
 * Scheduled task configuration
 */
export const SCHEDULER_CONFIG = {
	// Maximum number of scheduled emails to process per run
	SCHEDULED_BATCH_SIZE: 20,

	// Maximum number of retry emails to process per run
	RETRY_BATCH_SIZE: 10,

	// Cron expression for daily reports
	DAILY_REPORT_CRON: '57 23 * * *',
};

/**
 * HTTP client configuration
 */
export const HTTP_CONFIG = {
	// Default timeout for provider API calls (milliseconds)
	DEFAULT_TIMEOUT: 10000,
};
