/**
 * Prisma Email Service
 * Demonstrates how to use Prisma with the email microservice
 */

import { getPrismaClient } from '../lib/prisma-client';

interface EmailRequest {
	to: string | string[];
	from: string;
	subject?: string;
	body?: string;
	html?: string;
	templateName?: string;
	templateVariables?: Record<string, string | number | boolean>;
	provider?: 'ses' | 'resend';
}

interface EmailResponse {
	success: boolean;
	code: number;
	message: string;
}

class PrismaEmailService {
	/**
	 * Send an email with template support and blacklist checking using Prisma
	 */
	static async sendEmail(request: EmailRequest, env: Env): Promise<EmailResponse> {
		const { to, from, templateName, templateVariables } = request;
		const prisma = getPrismaClient(env);

		// Convert single recipient to array for consistent handling
		const recipients = Array.isArray(to) ? to : [to];

		try {
			// Check for blacklisted emails using Prisma
			const blacklistedEmails = await prisma.contact.findMany({
				where: {
					emailAddress: { in: recipients },
					isBlocked: true,
				},
			});

			const blacklistedAddresses = blacklistedEmails.map((contact: any) => contact.emailAddress);
			const validRecipients = recipients.filter((emailAddress: string) => !blacklistedAddresses.includes(emailAddress));

			// If all recipients are blacklisted, return error
			if (validRecipients.length === 0) {
				return {
					success: false,
					code: 400,
					message: `All recipients are blacklisted: ${blacklistedAddresses.join(', ')}`,
				};
			}

			// Log blacklisted recipients if any
			if (blacklistedAddresses.length > 0) {
				console.warn(`Skipping blacklisted recipients: ${blacklistedAddresses.join(', ')}`);
			}

			// Process template if provided
			if (templateName) {
				if (!templateVariables) {
					return {
						success: false,
						code: 400,
						message: 'Template variables are required when using a template',
					};
				}

				// Fetch template using Prisma
				const template = await prisma.messageTemplate.findFirst({
					where: { templateKey: templateName },
				});

				if (!template) {
					return {
						success: false,
						code: 404,
						message: `Template not found: ${templateName}`,
					};
				}

				// Process template with variable substitution
				let subject = template.subject;
				let body = template.bodyText;
				let html = template.bodyHtml;

				// Replace variables in all content
				Object.entries(templateVariables).forEach(([key, value]) => {
					const placeholder = new RegExp(`{{${key}}}`, 'g');
					subject = subject.replace(placeholder, String(value));

					if (html) {
						html = html.replace(placeholder, String(value));
					}

					body = body.replace(placeholder, String(value));
				});

				// Update request with processed template
				request.subject = subject;
				request.body = body;
				request.html = html ? html : undefined;
			} else {
				// Use direct content
				if (!request.subject || !request.body) {
					return {
						success: false,
						code: 400,
						message: 'Subject and body are required when not using a template',
					};
				}
			}

			// Record the message in the database
			for (const recipient of validRecipients) {
				// Get or create contact record
				const contactRecord = await prisma.contact.upsert({
					where: { emailAddress: recipient },
					update: {},
					create: {
						emailAddress: recipient,
						displayName: recipient.split('@')[0], // Simple default display name
					},
				});

				// Find the template if provided
				let templateId = null;
				if (templateName) {
					const template = await prisma.messageTemplate.findFirst({
						where: { templateKey: templateName },
					});
					if (template) {
						templateId = template.id;
					}
				}

				// Create message record
				await prisma.message.create({
					data: {
						email: {
							connect: { id: contactRecord.id },
						},
						templateId: templateId!,
						status: 'PENDING',
						metadata: templateVariables ? JSON.stringify(templateVariables) : null,
					},
				});
			}

			// For demonstration purposes, we'll just return success
			// In a real implementation, you would call the actual email sending service
			return {
				success: true,
				code: 201,
				message: `Email queued for delivery to ${validRecipients.join(', ')}`,
			};
		} catch (error: any) {
			console.error('Error in PrismaEmailService:', error);
			return {
				success: false,
				code: 500,
				message: `Error sending email: ${error.message}`,
			};
		}
	}

	/**
	 * Add an email to the blacklist using Prisma
	 */
	static async addToBlacklist(email: string, reason: string, env: Env): Promise<{ success: boolean; error?: string }> {
		const prisma = getPrismaClient(env);

		try {
			// Get or create contact record
			const contactRecord = await prisma.contact.upsert({
				where: { emailAddress: email },
				update: {
					isBlocked: true,
					blockReason: reason,
					blockedAt: new Date(),
				},
				create: {
					emailAddress: email,
					displayName: email.split('@')[0], // Simple default display name
					isBlocked: true,
					blockReason: reason,
					blockedAt: new Date(),
				},
			});

			// Create a record in the TemplateBlock table
			await prisma.templateBlock.upsert({
				where: { contactId: contactRecord.id },
				update: { blockReason: reason },
				create: {
					contact: {
						connect: { id: contactRecord.id },
					},
					blockReason: reason,
				},
			});

			return { success: true };
		} catch (error: any) {
			console.error(`Failed to add ${email} to blacklist: ${error}`);
			return { success: false, error: String(error) };
		}
	}

	/**
	 * Remove an email from the blacklist using Prisma
	 */
	static async removeFromBlacklist(email: string, env: Env): Promise<{ success: boolean; error?: string }> {
		const prisma = getPrismaClient(env);

		try {
			// Find the contact record
			const contactRecord = await prisma.contact.findUnique({
				where: { emailAddress: email },
				include: { BlockedContact: true },
			});

			if (!contactRecord || !contactRecord.isBlocked) {
				return { success: false, error: 'Email not found in blacklist' };
			}

			// Update the contact record
			await prisma.contact.update({
				where: { id: contactRecord.id },
				data: {
					isBlocked: false,
					blockReason: null,
					blockedAt: null,
				},
			});

			// Remove from TemplateBlock if it exists
			if (contactRecord.BlockedContact) {
				await prisma.templateBlock.delete({
					where: { contactId: contactRecord.id },
				});
			}

			return { success: true };
		} catch (error: any) {
			console.error(`Failed to remove ${email} from blacklist: ${error}`);
			return { success: false, error: String(error) };
		}
	}

	/**
	 * Check if an email is blacklisted using Prisma
	 */
	static async isBlacklisted(email: string, env: Env): Promise<{ isBlacklisted: boolean; reason?: string }> {
		const prisma = getPrismaClient(env);

		try {
			// Find the contact record
			const contactRecord = await prisma.contact.findUnique({
				where: { emailAddress: email },
			});

			if (contactRecord?.isBlocked) {
				return {
					isBlacklisted: true,
					reason: contactRecord.blockReason || undefined,
				};
			}

			return { isBlacklisted: false };
		} catch (error) {
			console.error(`Failed to check blacklist for ${email}: ${error}`);
			// Default to not blacklisted in case of error to avoid blocking legitimate emails
			return { isBlacklisted: false };
		}
	}
}

export default PrismaEmailService;
