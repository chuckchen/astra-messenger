/**
 * Custom Error Classes
 *
 * Provides consistent error handling across the application with retriability information.
 */

/**
 * Base application error with additional metadata
 */
export class ApplicationError extends Error {
	constructor(
		message: string,
		public readonly code: number,
		public readonly retriable: boolean = false,
	) {
		super(message);
		this.name = this.constructor.name;
		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (typeof (Error as any).captureStackTrace === 'function') {
			(Error as any).captureStackTrace(this, this.constructor);
		}
	}
}

/**
 * Validation errors (400) - not retriable
 * Used when request data is invalid or missing required fields
 */
export class ValidationError extends ApplicationError {
	constructor(message: string) {
		super(message, 400, false);
	}
}

/**
 * Not found errors (404) - not retriable
 * Used when a resource (template, contact, etc.) cannot be found
 */
export class NotFoundError extends ApplicationError {
	constructor(resource: string, identifier?: string) {
		const message = identifier ? `${resource} not found: ${identifier}` : `${resource} not found`;
		super(message, 404, false);
	}
}

/**
 * Configuration errors (500) - not retriable
 * Used when there's a configuration problem (missing API keys, invalid setup)
 */
export class ConfigurationError extends ApplicationError {
	constructor(message: string) {
		super(message, 500, false);
	}
}

/**
 * Provider errors - retriability depends on the specific error
 * Used when email provider APIs fail
 */
export class ProviderError extends ApplicationError {
	constructor(
		public readonly provider: string,
		message: string,
		code: number,
		retriable: boolean,
	) {
		super(`${provider} error: ${message}`, code, retriable);
	}
}

/**
 * Rate limit errors (429) - retriable
 * Used when rate limits are exceeded
 */
export class RateLimitError extends ApplicationError {
	constructor(message: string = 'Rate limit exceeded') {
		super(message, 429, true);
	}
}

/**
 * Network/timeout errors (500) - retriable
 * Used for transient network issues
 */
export class NetworkError extends ApplicationError {
	constructor(message: string) {
		super(message, 500, true);
	}
}

/**
 * Convert unknown errors to ApplicationError
 *
 * @param error - Any error object
 * @returns ApplicationError instance
 */
export function normalizeError(error: unknown): ApplicationError {
	if (error instanceof ApplicationError) {
		return error;
	}

	if (error instanceof Error) {
		// Check if it's a network-related error
		const message = error.message.toLowerCase();
		if (message.includes('timeout') || message.includes('network') || message.includes('econnrefused') || message.includes('econnreset')) {
			return new NetworkError(error.message);
		}

		// Generic server error
		return new ApplicationError(error.message, 500, true);
	}

	// Unknown error type
	return new ApplicationError(String(error), 500, true);
}

/**
 * Check if an HTTP status code represents a retriable error
 *
 * @param statusCode - HTTP status code
 * @returns true if the error is retriable
 */
export function isRetriableStatusCode(statusCode: number): boolean {
	// Rate limiting
	if (statusCode === 429) {
		return true;
	}

	// Server errors (but not client errors)
	if (statusCode >= 500) {
		return true;
	}

	// All other errors are not retriable
	return false;
}
