/**
 * Email Provider Interface and Factory
 *
 * Provides a unified interface for all email providers and a factory function
 * to get the appropriate provider based on configuration.
 */

import type { EmailProvider, ProviderResponse } from '../types';
import sendMailerSend from './mailersend-client';
import sendResend from './resend-client';
import sendSes from './ses-client';

/**
 * Parameters for sending an email
 */
export interface EmailProviderParams {
	to: string | string[];
	from: string;
	subject: string;
	text: string;
	html: string;
}

/**
 * Email provider function signature
 */
export type EmailProviderFunction = (params: EmailProviderParams, env: Env) => Promise<ProviderResponse>;

/**
 * Get the appropriate email provider function based on the provider name
 *
 * @param provider - The email provider name
 * @returns The provider function
 * @throws Error if provider is not recognized
 */
export function getEmailProvider(provider: EmailProvider): EmailProviderFunction {
	switch (provider) {
		case 'ses':
			return sendSes;
		case 'resend':
			return sendResend;
		case 'mailersend':
			return sendMailerSend;
		default:
			// Fallback to mailersend for unknown providers
			return sendMailerSend;
	}
}

/**
 * Get the name of the provider for logging purposes
 *
 * @param provider - The email provider type
 * @returns Human-readable provider name
 */
export function getProviderName(provider: EmailProvider): string {
	switch (provider) {
		case 'ses':
			return 'AWS SES';
		case 'resend':
			return 'Resend';
		case 'mailersend':
			return 'MailerSend';
		default:
			return 'Unknown Provider';
	}
}

/**
 * List all available email providers
 *
 * @returns Array of available provider names
 */
export function getAvailableProviders(): EmailProvider[] {
	return ['ses', 'resend', 'mailersend'];
}
