/**
 * Unified Email Service
 * Handles email sending with template support and blacklist checking
 */

import sendResend from '../lib/resend-client';
import sendSes from '../lib/ses-client';
import BlacklistService from './BlacklistService';
import TemplateService from './TemplateService';

// Email provider types
type EmailProvider = 'ses' | 'resend';

// Email request interface
interface EmailRequest {
	to: string | string[];
	from: string;
	subject?: string;
	body?: string;
	html?: string;
	templateName?: string;
	templateVariables?: Record<string, string | number | boolean>;
	provider?: EmailProvider;
}

// Email response interface
interface EmailResponse {
	success: boolean;
	code: number;
	message: string;
}

class EmailService {
	/**
	 * Send an email with template support and blacklist checking
	 */
	static async sendEmail(request: EmailRequest, env: Env): Promise<EmailResponse> {
		const { to, from, templateName, templateVariables, provider = 'ses' } = request;

		// Convert single recipient to array for consistent handling
		const recipients = Array.isArray(to) ? to : [to];

		// Check if any recipients are blacklisted
		const blacklistChecks = await Promise.all(recipients.map((email) => BlacklistService.isBlacklisted(email, env)));

		// Filter out blacklisted recipients
		const validRecipients = recipients.filter((_, index) => !blacklistChecks[index].isBlacklisted);
		const blacklistedRecipients = recipients.filter((_, index) => blacklistChecks[index].isBlacklisted);

		// If all recipients are blacklisted, return error
		if (validRecipients.length === 0) {
			return {
				success: false,
				code: 400,
				message: `All recipients are blacklisted: ${blacklistedRecipients.join(', ')}`,
			};
		}

		// Log blacklisted recipients if any
		if (blacklistedRecipients.length > 0) {
			console.warn(`Skipping blacklisted recipients: ${blacklistedRecipients.join(', ')}`);
		}

		let subject: string;
		let body: string;
		let html: string | undefined;

		// Process template if provided
		if (templateName) {
			if (!templateVariables) {
				return {
					success: false,
					code: 400,
					message: 'Template variables are required when using a template',
				};
			}

			const processedTemplate = await TemplateService.getProcessedTemplate(templateName, templateVariables, env);

			if (!processedTemplate) {
				return {
					success: false,
					code: 404,
					message: `Template not found: ${templateName}`,
				};
			}

			subject = processedTemplate.subject;
			body = processedTemplate.text;
			html = processedTemplate.html || undefined;
		} else {
			// Use direct content
			if (!request.subject || !request.body) {
				return {
					success: false,
					code: 400,
					message: 'Subject and body are required when not using a template',
				};
			}

			subject = request.subject;
			body = request.body;
			html = request.html;
		}

		// Send email using the specified provider
		try {
			let result;

			if (provider === 'resend') {
				result = await sendResend({ to: validRecipients, from, subject, body, html }, env);
			} else {
				// Default to SES
				result = await sendSes({ to: validRecipients, from, subject, body }, env);
			}

			return {
				success: result.code >= 200 && result.code < 300,
				code: result.code,
				message: result.message,
			};
		} catch (error: any) {
			return {
				success: false,
				code: 500,
				message: `Error sending email: ${error.message}`,
			};
		}
	}
}

export default EmailService;
