/**
 * Handles email sending with template support and blacklist checking
 */

import { EMAIL_CONFIG } from '../config';
import { getEmailProvider } from '../lib/email-provider';
import TemplateOptOutService from '../optout/optout-service';
import type { DirectEmailRequest, EmailResponse, EmailSendParams, TemplateEmailRequest } from '../types';
import { formatRecipientsForLog, normalizeRecipients } from './email-utils';
import TemplateService from './templates';

class EmailService {
	/**
	 * Send an email using a template
	 */
	static async sendTemplateEmail(request: TemplateEmailRequest, env: Env): Promise<EmailResponse> {
		const { to, from, templateName, templateVariables, provider = EMAIL_CONFIG.DEFAULT_PROVIDER } = request;

		// Convert single recipient to array for consistent handling
		const recipients = normalizeRecipients(to);

		// Check if any recipients are blacklisted for this template
		const OptOutChecks = await Promise.all(recipients.map((email) => TemplateOptOutService.isOptedOut(email, templateName, env)));

		// Filter out blacklisted recipients
		const validRecipients = recipients.filter((_, index) => !OptOutChecks[index].isOptedOut);
		const optedOutRecipients = recipients.filter((_, index) => OptOutChecks[index].isOptedOut);

		// If all recipients are blacklisted, return error
		if (validRecipients.length === 0) {
			return {
				success: false,
				code: 400,
				message: `All recipients are blacklisted for template "${templateName}": ${formatRecipientsForLog(optedOutRecipients)}`,
			};
		}

		// Log blacklisted recipients if any
		if (optedOutRecipients.length > 0) {
			console.warn(`Skipping blacklisted recipients for template "${templateName}": ${formatRecipientsForLog(optedOutRecipients)}`);
		}

		// Process the template
		const processedTemplate = await TemplateService.getProcessedTemplate(templateName, templateVariables, env);

		if (!processedTemplate) {
			return {
				success: false,
				code: 404,
				message: `Template not found: ${templateName}`,
			};
		}

		// Send the email with the processed template content
		return this.sendToProvider(
			{
				to: validRecipients,
				from,
				subject: processedTemplate.subject,
				text: processedTemplate.text,
				html: processedTemplate.html,
				provider,
			},
			env,
		);
	}

	/**
	 * Send an email with direct content
	 */
	static async sendDirectEmail(request: DirectEmailRequest, env: Env): Promise<EmailResponse> {
		const { to, from, subject, body, html, provider = EMAIL_CONFIG.DEFAULT_PROVIDER } = request;

		if (!subject || !body) {
			return {
				success: false,
				code: 400,
				message: 'Subject and body are required for direct emails',
			};
		}

		// Convert single recipient to array for consistent handling
		const recipients = normalizeRecipients(to);

		// Send the email with direct content
		return this.sendToProvider({ to: recipients, from, subject, text: body, html, provider }, env);
	}

	/**
	 * Send email using the specified provider
	 */
	private static async sendToProvider(params: EmailSendParams, env: Env): Promise<EmailResponse> {
		try {
			// Get the appropriate provider function
			const providerFunction = getEmailProvider(params.provider);

			// Send the email
			const result = await providerFunction(
				{
					to: params.to,
					from: params.from,
					subject: params.subject,
					text: params.text,
					html: params.html,
				},
				env,
			);

			return {
				success: result.code >= 200 && result.code < 300,
				code: result.code,
				message: result.message,
				data: result.data,
				retriable: result.retriable ?? false,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`Error sending email via ${params.provider}: ${errorMessage}`);
			return {
				success: false,
				code: 500,
				message: `Error sending email: ${errorMessage}`,
				retriable: true,
			};
		}
	}
}

export default EmailService;
