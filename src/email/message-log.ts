import { type Message as MessageType } from '@prisma/client';

import { getPrismaClient } from '../lib/prisma-client';
import { getEmail } from '../lib/utils';
import type { DirectEmailRequest, EmailResponse, TemplateEmailRequest } from '../types';
import TemplateService from './templates';

class MessageLogService {
	/**
	 * Update the status of a message in the database
	 */
	static async updateMessageLog(
		id: number | string,
		result: EmailResponse,
		env: Env,
		options?: {
			attempts?: number;
			nextRetryAt?: Date;
			provider?: string;
		},
	): Promise<void> {
		const prisma = getPrismaClient(env);

		const status = result.success ? 'SENT' : 'FAILED';
		const { id: externalId } = result.data ? result.data : {};
		const messageId = typeof id === 'string' ? parseInt(id, 10) : id;

		try {
			await prisma.message.update({
				where: { id: messageId },
				data: {
					status,
					...(externalId && { externalId }),
					...(status === 'SENT' ? { sentAt: new Date() } : { errorDetails: result.message }),
					...(options?.attempts !== undefined && { attempts: options.attempts }),
					...(options?.nextRetryAt && { nextRetryAt: options.nextRetryAt }),
					...(options?.provider && { provider: options.provider }),
					...(result.message && { lastError: result.message }),
				},
			});
		} catch (error) {
			console.error(`Error updating message status: ${error}`);
		}
	}

	/**
	 * Log a template email to the database
	 */
	static async logTemplateEmail(
		request: TemplateEmailRequest,
		env: Env,
		options?: {
			externalId?: string;
			scheduledAt?: Date;
			provider?: string;
		},
	): Promise<MessageType[]> {
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

		// Determine status based on scheduling
		const status = options?.scheduledAt && options.scheduledAt > new Date() ? 'SCHEDULED' : 'QUEUED';

		// Log message for each recipient
		try {
			const results = await Promise.all(
				recipients.map(async (email) => {
					// Find or create contact
					const { displayName, emailAddress } = getEmail(email);
					const contact = await prisma.contact.upsert({
						where: { emailAddress },
						update: {},
						create: { emailAddress, displayName },
					});

					// Create message log
					return await prisma.message.create({
						data: {
							contactId: contact.id,
							templateId: template.id,
							status,
							variables: JSON.stringify(templateVariables),
							...(options?.externalId && { externalId: options.externalId }),
							...(options?.scheduledAt && { scheduledAt: options.scheduledAt }),
							...(options?.provider && { provider: options.provider }),
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
	static async logDirectEmail(
		request: Omit<DirectEmailRequest, 'body' | 'html'>,
		env: Env,
		options?: {
			externalId?: string;
			scheduledAt?: Date;
			provider?: string;
		},
	): Promise<MessageType[]> {
		const { to } = request;
		const prisma = getPrismaClient(env);

		// Convert single recipient to array for consistent handling
		const recipients = Array.isArray(to) ? to : [to];

		// Determine status based on scheduling
		const status = options?.scheduledAt && options.scheduledAt > new Date() ? 'SCHEDULED' : 'QUEUED';

		// Log message for each recipient
		try {
			const results = await Promise.all(
				recipients.map(async (email) => {
					// Find or create contact
					const { displayName, emailAddress } = getEmail(email);
					const contact = await prisma.contact.upsert({
						where: { emailAddress },
						update: {},
						create: { emailAddress, displayName },
					});

					// Create message log (without template)
					return await prisma.message.create({
						data: {
							contactId: contact.id,
							status,
							...(options?.externalId && { externalId: options.externalId }),
							...(options?.scheduledAt && { scheduledAt: options.scheduledAt }),
							...(options?.provider && { provider: options.provider }),
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
		options?: {
			externalId?: string;
			scheduledAt?: Date;
			provider?: string;
		},
	): Promise<MessageType[]> {
		// Determine if this is a template email by checking for templateName property
		if ('templateName' in request) {
			return await this.logTemplateEmail(request, env, options);
		} else {
			return await this.logDirectEmail(request, env, options);
		}
	}
}

export default MessageLogService;
