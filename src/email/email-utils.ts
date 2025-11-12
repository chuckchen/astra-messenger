/**
 * Email Utilities
 *
 * Shared utility functions for email processing, validation, and formatting.
 */

import { EMAIL_CONFIG } from '../config';
import type { EmailProvider } from '../types';

/**
 * Parse template variables from a JSON string
 *
 * @param variablesJson - JSON string containing template variables
 * @returns Parsed variables object or empty object if invalid
 */
export function parseTemplateVariables(variablesJson: string | null): Record<string, string | number | boolean> {
	if (!variablesJson) {
		return {};
	}

	try {
		return JSON.parse(variablesJson);
	} catch (error) {
		console.error(`Failed to parse template variables: ${variablesJson}`, error);
		return {};
	}
}

/**
 * Validate that an email address is properly formatted
 *
 * @param email - Email address to validate
 * @returns true if email is valid
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Normalize recipient(s) to an array of email addresses
 *
 * @param to - Single email or array of emails
 * @returns Array of email addresses
 */
export function normalizeRecipients(to: string | string[]): string[] {
	return Array.isArray(to) ? to : [to];
}

/**
 * Get the appropriate email provider, falling back to default if not specified
 *
 * @param provider - Requested provider or undefined
 * @returns Valid email provider
 */
export function getProvider(provider?: EmailProvider | string): EmailProvider {
	// Validate and return provider, or use default
	if (provider === 'ses' || provider === 'resend' || provider === 'mailersend') {
		return provider;
	}
	return EMAIL_CONFIG.DEFAULT_PROVIDER;
}

/**
 * Format recipients for logging (truncate if too many)
 *
 * @param recipients - Array of email addresses
 * @returns Formatted string for logging
 */
export function formatRecipientsForLog(recipients: string[]): string {
	if (recipients.length === 1) {
		return recipients[0];
	}
	if (recipients.length <= 3) {
		return recipients.join(', ');
	}
	return `${recipients.slice(0, 3).join(', ')} and ${recipients.length - 3} more`;
}

/**
 * Check if a date is in the future
 *
 * @param date - Date to check
 * @returns true if date is in the future
 */
export function isFutureDate(date: Date): boolean {
	return date > new Date();
}

/**
 * Parse and validate a date string for scheduling
 *
 * @param sendAt - ISO 8601 date string
 * @returns Parsed Date object or null if invalid
 */
export function parseScheduledDate(sendAt: string | undefined): Date | null {
	if (!sendAt) {
		return null;
	}

	const date = new Date(sendAt);
	if (isNaN(date.getTime())) {
		return null;
	}

	return date;
}
