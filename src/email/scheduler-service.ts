/**
 * Scheduler Service
 *
 * Handles retrieval and processing of scheduled and retry-pending emails.
 */

import { type Contact, type Message as MessageType, type Template } from '@prisma/client';

import { getPrismaClient } from '../lib/prisma-client';

// Message with included relations
export type MessageWithRelations = MessageType & {
	contact: Contact;
	template: Template | null;
};

class SchedulerService {
	/**
	 * Get scheduled emails that are due to be sent
	 *
	 * @param env - Environment with DB binding
	 * @param limit - Maximum number of messages to retrieve (default: 20)
	 * @returns Array of messages ready to be sent
	 */
	static async getScheduledEmails(env: Env, limit: number = 20): Promise<MessageWithRelations[]> {
		const prisma = getPrismaClient(env);

		try {
			const messages = await prisma.message.findMany({
				where: {
					status: {
						in: ['SCHEDULED', 'QUEUED'],
					},
					scheduledAt: {
						lte: new Date(),
					},
					attempts: {
						lt: prisma.message.fields.maxAttempts,
					},
				},
				take: limit,
				orderBy: {
					scheduledAt: 'asc',
				},
				include: {
					contact: true,
					template: true,
				},
			});

			return messages;
		} catch (error) {
			console.error(`Error fetching scheduled emails: ${error}`);
			return [];
		}
	}

	/**
	 * Get failed emails that are ready for retry
	 *
	 * @param env - Environment with DB binding
	 * @param limit - Maximum number of messages to retrieve (default: 10)
	 * @returns Array of messages ready to be retried
	 */
	static async getRetriableEmails(env: Env, limit: number = 10): Promise<MessageWithRelations[]> {
		const prisma = getPrismaClient(env);

		try {
			const now = new Date();

			const messages = await prisma.message.findMany({
				where: {
					status: 'FAILED',
					attempts: {
						lt: prisma.message.fields.maxAttempts,
					},
					OR: [
						// Messages with nextRetryAt in the past or null (immediate retry)
						{
							nextRetryAt: {
								lte: now,
							},
						},
						{
							nextRetryAt: null,
						},
					],
				},
				take: limit,
				orderBy: {
					nextRetryAt: 'asc',
				},
				include: {
					contact: true,
					template: true,
				},
			});

			return messages;
		} catch (error) {
			console.error(`Error fetching retriable emails: ${error}`);
			return [];
		}
	}

	/**
	 * Mark a message as processing to prevent duplicate processing
	 *
	 * @param messageId - Message ID to lock
	 * @param env - Environment with DB binding
	 * @returns true if successfully locked, false otherwise
	 */
	static async lockMessage(messageId: number | string, env: Env): Promise<boolean> {
		const prisma = getPrismaClient(env);
		const id = typeof messageId === 'string' ? parseInt(messageId, 10) : messageId;

		try {
			const result = await prisma.message.updateMany({
				where: {
					id,
					status: {
						in: ['SCHEDULED', 'QUEUED', 'FAILED'],
					},
				},
				data: {
					status: 'PROCESSING',
				},
			});

			return result.count > 0;
		} catch (error) {
			console.error(`Error locking message ${messageId}: ${error}`);
			return false;
		}
	}

	/**
	 * Get message details by ID including related contact and template
	 *
	 * @param messageId - Message ID
	 * @param env - Environment with DB binding
	 * @returns Message with related data or null
	 */
	static async getMessage(messageId: number, env: Env): Promise<MessageType | null> {
		const prisma = getPrismaClient(env);

		try {
			const message = await prisma.message.findUnique({
				where: { id: messageId },
				include: {
					contact: true,
					template: true,
				},
			});

			return message;
		} catch (error) {
			console.error(`Error fetching message ${messageId}: ${error}`);
			return null;
		}
	}
}

export default SchedulerService;
