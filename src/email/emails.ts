/**
 * Handles email sending with template support and blacklist checking
 */

import sendMailerSend from '../lib/mailersend-client';
import sendResend from '../lib/resend-client';
import sendSes from '../lib/ses-client';
import TemplateOptOutService from '../optout/optout-service';
import TemplateService from './templates';

// Email provider types
type EmailProvider = 'ses' | 'resend' | 'mailersend';

// Email response interface
interface EmailResponse {
	success: boolean;
	code: number;
	message: string;
	data?: any;
}

// Email request interfaces
interface BaseEmailRequest {
	to: string | string[];
	from: string;
	provider?: EmailProvider;
}

interface TemplateEmailRequest extends BaseEmailRequest {
	templateName: string;
	templateVariables: Record<string, string | number | boolean>;
}

interface DirectEmailRequest extends BaseEmailRequest {
	subject: string;
	body: string;
	html: string;
}

class EmailService {
	/**
	 * Send an email using a template
	 */
	static async sendTemplateEmail(request: TemplateEmailRequest, env: Env): Promise<EmailResponse> {
		const { to, from, templateName, templateVariables, provider = 'resend' } = request;

		// Convert single recipient to array for consistent handling
		const recipients = Array.isArray(to) ? to : [to];

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
				message: `All recipients are blacklisted for template "${templateName}": ${optedOutRecipients.join(', ')}`,
			};
		}

		// Log blacklisted recipients if any
		if (optedOutRecipients.length > 0) {
			console.warn(`Skipping blacklisted recipients for template "${templateName}": ${optedOutRecipients.join(', ')}`);
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
		const { to, from, subject, body, html, provider = 'resend' } = request;

		if (!subject || !body) {
			return {
				success: false,
				code: 400,
				message: 'Subject and body are required for direct emails',
			};
		}

		// Convert single recipient to array for consistent handling
		const recipients = Array.isArray(to) ? to : [to];

		// Send the email with direct content
		return this.sendToProvider({ to: recipients, from, subject, text: body, html, provider }, env);
	}

	/**
	 * Send email using the specified provider
	 */
	private static async sendToProvider(
		{
			to,
			from,
			subject,
			text,
			html,
			provider,
		}: { to: string[]; from: string; subject: string; text: string; html: string; provider: EmailProvider },
		env: Env,
	): Promise<EmailResponse> {
		try {
			let result;

			switch (provider) {
				case 'resend':
					result = await sendResend({ to, from, subject, text, html }, env);
					break;
				case 'mailersend':
					result = await sendMailerSend({ to, from, subject, text, html }, env);
					break;
				case 'ses':
					result = await sendSes({ to, from, subject, text, html }, env);
					break;
				default:
					result = await sendResend({ to, from, subject, text, html }, env);
			}

			return { success: result.code >= 200 && result.code < 300, code: result.code, message: result.message };
		} catch (error: any) {
			return { success: false, code: 500, message: `Error sending email: ${error.message}` };
		}
	}
}

export { EmailService as default, type DirectEmailRequest, type EmailResponse, type TemplateEmailRequest };
