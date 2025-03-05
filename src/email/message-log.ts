import { type Message as MessageType } from '@prisma/client';

import { getPrismaClient } from '../lib/prisma-client';
import { getEmailName } from '../lib/utils';
import { DirectEmailRequest, EmailResponse, TemplateEmailRequest } from './emails';
import TemplateService from './templates';

class MessageLogService {
	/**
	 * Update the status of a message in the database
	 */
	static async updateMessageLog(id: number, result: EmailResponse, env: Env): Promise<void> {
		const prisma = getPrismaClient(env);

		const status = result.success ? 'SENT' : 'FAILED';
		const { id: externalId } = result.data ? result.data : {};

		try {
			await prisma.message.update({
				where: { id },
				data: {
					status,
					...(externalId && { externalId }),
					...(status === 'SENT' && { sentAt: new Date() }),
					errorDetails: result.message,
				},
			});
		} catch (error) {
			console.error(`Error updating message status: ${error}`);
		}
	}

	/**
	 * Log a template email to the database
	 */
	static async logTemplateEmail(request: TemplateEmailRequest, env: Env, externalId?: string): Promise<MessageType[]> {
		const { to, templateName, templateVariables } = request;
		const prisma = getPrismaClient(env);

		// Get template ID
		const template = await TemplateService.getTemplate(templateName, env);
		if (!template) {
			console.error(`Failed to log message: Template not found: ${templateName}`);
			return [];
		}

		// Convert single recipient to array for consistent handling
		const recipients = Array.isArray(to) ? to : [to];

		// Log message for each recipient
		try {
			const results = await Promise.all(
				recipients.map(async (email) => {
					// Find or create contact
					const contact = await prisma.contact.upsert({
						where: { emailAddress: email },
						update: { displayName: getEmailName(email) },
						create: { emailAddress: email, displayName: getEmailName(email) },
					});

					// Create message log
					return await prisma.message.create({
						data: {
							contactId: contact.id,
							templateId: template.id,
							status: 'PENDING',
							variables: JSON.stringify(templateVariables),
							...(externalId && { externalId }),
						},
					});
				}),
			);

			return results;
		} catch (error) {
			console.error(`Error logging template email: ${error}`);
			return [];
		}
	}

	/**
	 * Log a direct email to the database
	 */
	static async logDirectEmail(request: Omit<DirectEmailRequest, 'body' | 'html'>, env: Env, externalId?: string): Promise<MessageType[]> {
		const { to } = request;
		const prisma = getPrismaClient(env);

		// Convert single recipient to array for consistent handling
		const recipients = Array.isArray(to) ? to : [to];

		// Log message for each recipient
		try {
			const results = await Promise.all(
				recipients.map(async (email) => {
					// Find or create contact
					const contact = await prisma.contact.upsert({
						where: { emailAddress: email },
						update: { displayName: getEmailName(email) },
						create: { emailAddress: email, displayName: getEmailName(email) },
					});

					// Create message log (without template)
					return await prisma.message.create({
						data: {
							contactId: contact.id,
							status: 'PENDING',
							...(externalId && { externalId }),
						},
					});
				}),
			);

			return results;
		} catch (error) {
			console.error(`Error logging direct email: ${error}`);
			return [];
		}
	}

	/**
	 * Log a message to the database - facades both template and direct emails
	 */
	static async logMessage(
		request: TemplateEmailRequest | Omit<DirectEmailRequest, 'body' | 'html'>,
		env: Env,
		upstreamId?: string,
	): Promise<MessageType[]> {
		// Determine if this is a template email by checking for templateName property
		if ('templateName' in request) {
			return await this.logTemplateEmail(request, env, upstreamId);
		} else {
			return await this.logDirectEmail(request, env, upstreamId);
		}
	}
}

export default MessageLogService;
