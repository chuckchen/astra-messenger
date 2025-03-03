/**
 * Prisma Subscription Service
 * Handles subscription management using Prisma
 */

import { getPrismaClient } from '../lib/prisma-client';

interface SubscriptionResult {
	success: boolean;
	message: string;
	data?: any;
	error?: string;
}

class PrismaSubscriptionService {
	/**
	 * Subscribe a contact to a project
	 */
	static async subscribe(email: string, projectKey: string, env: Env): Promise<SubscriptionResult> {
		const prisma = getPrismaClient(env);

		try {
			// Get or create contact
			const contact = await prisma.contact.upsert({
				where: { emailAddress: email },
				update: {},
				create: {
					emailAddress: email,
					displayName: email.split('@')[0], // Simple default display name
				},
			});

			// Find the project
			const project = await prisma.project.findUnique({
				where: { projectKey },
			});

			if (!project) {
				return {
					success: false,
					message: 'Project not found',
					error: `Project with key ${projectKey} not found`,
				};
			}

			// Check if subscription already exists
			const existingWaitlist = await prisma.waitlist.findUnique({
				where: {
					contactId_productId: {
						contactId: contact.id,
						productId: project.id,
					},
				},
			});

			if (existingWaitlist) {
				// If already exists but was unsubscribed, reactivate it
				if (existingWaitlist.status !== 'WAITING') {
					await prisma.waitlist.update({
						where: {
							id: existingWaitlist.id,
						},
						data: {
							status: 'WAITING',
							updatedAt: new Date(),
						},
					});

					return {
						success: true,
						message: 'Subscription reactivated',
						data: existingWaitlist.id,
					};
				}

				return {
					success: true,
					message: 'Already subscribed',
					data: existingWaitlist.id,
				};
			}

			// Create new subscription
			const waitlist = await prisma.waitlist.create({
				data: {
					contact: {
						connect: { id: contact.id },
					},
					product: {
						connect: { id: project.id },
					},
					status: 'WAITING',
				},
			});

			return {
				success: true,
				message: 'Subscription created',
				data: waitlist.id,
			};
		} catch (error: any) {
			console.error('Error in subscribe:', error);
			return {
				success: false,
				message: 'Failed to subscribe',
				error: error.message,
			};
		}
	}

	/**
	 * Unsubscribe a contact from a project
	 */
	static async unsubscribe(email: string, projectKey: string, env: Env): Promise<SubscriptionResult> {
		const prisma = getPrismaClient(env);

		try {
			// Find the contact
			const contact = await prisma.contact.findUnique({
				where: { emailAddress: email },
			});

			if (!contact) {
				return {
					success: false,
					message: 'Contact not found',
					error: `Contact with email ${email} not found`,
				};
			}

			// Find the project
			const project = await prisma.project.findUnique({
				where: { projectKey },
			});

			if (!project) {
				return {
					success: false,
					message: 'Project not found',
					error: `Project with key ${projectKey} not found`,
				};
			}

			// Update the subscription status to UNSUBSCRIBED
			const result = await prisma.waitlist.updateMany({
				where: {
					contactId: contact.id,
					productId: project.id,
				},
				data: {
					status: 'UNSUBSCRIBED',
					updatedAt: new Date(),
				},
			});

			if (result.count === 0) {
				return {
					success: false,
					message: 'Subscription not found',
					error: 'No active subscription found for this contact and project',
				};
			}

			return {
				success: true,
				message: 'Successfully unsubscribed',
				data: result.count,
			};
		} catch (error: any) {
			console.error('Error in unsubscribe:', error);
			return {
				success: false,
				message: 'Failed to unsubscribe',
				error: error.message,
			};
		}
	}

	/**
	 * Get subscription status for a contact and project
	 */
	static async getSubscriptionStatus(email: string, projectKey: string, env: Env): Promise<SubscriptionResult> {
		const prisma = getPrismaClient(env);

		try {
			// Find the contact and project
			const contact = await prisma.contact.findUnique({
				where: { emailAddress: email },
			});

			if (!contact) {
				return {
					success: false,
					message: 'Contact not found',
					error: `Contact with email ${email} not found`,
				};
			}

			const project = await prisma.project.findUnique({
				where: { projectKey },
			});

			if (!project) {
				return {
					success: false,
					message: 'Project not found',
					error: `Project with key ${projectKey} not found`,
				};
			}

			// Get the subscription
			const waitlist = await prisma.waitlist.findUnique({
				where: {
					contactId_productId: {
						contactId: contact.id,
						productId: project.id,
					},
				},
			});

			if (!waitlist) {
				return {
					success: false,
					message: 'Not subscribed',
					data: { status: 'NONE' },
				};
			}

			return {
				success: true,
				message: 'Subscription found',
				data: {
					status: waitlist.status,
					createdAt: waitlist.createdAt,
					updatedAt: waitlist.updatedAt,
					notifiedAt: waitlist.notifiedAt,
				},
			};
		} catch (error: any) {
			console.error('Error in getSubscriptionStatus:', error);
			return {
				success: false,
				message: 'Failed to get subscription status',
				error: error.message,
			};
		}
	}
}

export default PrismaSubscriptionService;
