/**
 * Email Opt Out Service
 */

import { getPrismaClient } from '../lib/prisma-client';

interface OptOutResult {
	isOptedOut: boolean;
	reason?: string;
}

class TemplateOptOutService {
	/**
	 * Check if an email is blacklisted for a specific template
	 */
	static async isOptedOut(emailAddress: string, templateKey: string, env: Env): Promise<OptOutResult> {
		const prisma = getPrismaClient(env);

		try {
			// Find the contact by email with their template blocks for the specific template
			const contact = await prisma.contact.findUnique({
				where: { emailAddress: emailAddress },
				include: {
					optOuts: {
						where: {
							template: {
								key: templateKey,
							},
						},
					},
				},
			});

			// Check if the contact exists and has any template blocks for this template
			if (contact && contact.optOuts.length > 0) {
				return {
					isOptedOut: true,
					reason: contact.optOuts[0].reason || undefined,
				};
			}

			return { isOptedOut: false };
		} catch (error) {
			console.error(`Failed to check blacklist for ${emailAddress} on template ${templateKey}: ${error}`);
			// Default to not blacklisted in case of error to avoid blocking legitimate emails
			return { isOptedOut: false };
		}
	}

	/**
	 * Add an email to the blacklist for a specific template
	 */
	static async addOptOut(
		emailAddress: string,
		templateKey: string,
		reason: string,
		env: Env,
	): Promise<{ success: boolean; error?: string }> {
		const prisma = getPrismaClient(env);

		try {
			// Start a transaction
			return await prisma.$transaction(async (tx) => {
				// Get or create the contact
				const contact = await tx.contact.upsert({
					where: { emailAddress: emailAddress },
					update: {},
					create: {
						emailAddress: emailAddress,
						displayName: emailAddress.split('@')[0],
					},
				});

				// Find the template by name
				const template = await tx.template.findFirst({
					where: { key: templateKey },
					select: { id: true },
				});

				if (!template) {
					return { success: false, error: `Template "${templateKey}" not found` };
				}

				// Check if a block already exists
				const existingOptOuts = await tx.templateOptOut.findFirst({
					where: {
						contactId: contact.id,
						templateId: template.id,
					},
				});

				if (existingOptOuts) {
					// Update existing block
					await tx.templateOptOut.update({
						where: { id: existingOptOuts.id },
						data: { reason },
					});
				} else {
					// Create new block
					await tx.templateOptOut.create({
						data: {
							contact: { connect: { id: contact.id } },
							template: { connect: { id: template.id } },
							reason,
						},
					});
				}

				return { success: true };
			});
		} catch (error) {
			console.error(`Failed to add ${emailAddress} to blacklist for template "${templateKey}": ${error}`);
			return { success: false, error: String(error) };
		}
	}

	/**
	 * Get all opted out emails for a specific template
	 */
	static async getAllOptOuts(
		templateKey: string,
		env: Env,
	): Promise<{
		success: boolean;
		data: Array<{ email: string; reason?: string }>;
		error?: string;
	}> {
		const prisma = getPrismaClient(env);

		try {
			// Find all contacts with template blocks for the specific template
			const contacts = await prisma.contact.findMany({
				where: {
					optOuts: {
						some: {
							template: {
								key: templateKey,
							},
						},
					},
				},
				include: {
					optOuts: {
						where: {
							template: {
								key: templateKey,
							},
						},
					},
				},
			});

			// Format the response
			const optedOutEmails = contacts.map((contact) => ({
				email: contact.emailAddress,
				reason: contact.optOuts[0]?.reason || undefined,
			}));

			return {
				success: true,
				data: optedOutEmails,
			};
		} catch (error) {
			console.error(`Failed to get blacklisted emails for template "${templateKey}": ${error}`);
			return {
				success: false,
				data: [],
				error: String(error),
			};
		}
	}

	/**
	 * Remove an email from the blacklist for a specific template
	 */
	static async removeOptOut(email: string, templateName: string, env: Env): Promise<{ success: boolean; error?: string }> {
		const prisma = getPrismaClient(env);

		try {
			// Find the contact
			const contact = await prisma.contact.findUnique({
				where: { emailAddress: email },
			});

			if (!contact) {
				return { success: false, error: 'Email not found' };
			}

			// Find the template
			const template = await prisma.template.findFirst({
				where: { key: templateName },
			});

			if (!template) {
				return { success: false, error: `Template "${templateName}" not found` };
			}

			// Delete the specific template block for this contact
			const result = await prisma.templateOptOut.deleteMany({
				where: {
					contactId: contact.id,
					templateId: template.id,
				},
			});

			if (result.count === 0) {
				return { success: false, error: `Email not blacklisted for template "${templateName}"` };
			}

			return { success: true };
		} catch (error) {
			console.error(`Failed to remove ${email} from blacklist for template "${templateName}": ${error}`);
			return { success: false, error: String(error) };
		}
	}
}

export default TemplateOptOutService;
