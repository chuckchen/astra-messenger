/**
 * Waitlist Service
 * Handles project enrollment and waitlist management
 */

import { getPrismaClient } from '../lib/prisma-client';

// Define the waitlist status enum to match the Prisma schema
type WaitlistStatus = 'WAITING' | 'NOTIFIED' | 'CONVERTED';

interface WaitlistResult {
	success: boolean;
	message: string;
	data?: any;
	error?: string;
}

class WaitlistService {
	/**
	 * Join a project waitlist
	 */
	static async joinWaitlist(email: string, projectKey: string, env: Env): Promise<WaitlistResult> {
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

			// Check if already on waitlist
			const existingWaitlist = await prisma.waitlist.findUnique({
				where: {
					contactId_productId: {
						contactId: contact.id,
						productId: project.id,
					},
				},
			});

			if (existingWaitlist) {
				return {
					success: true,
					message: 'Already on waitlist',
					data: {
						id: existingWaitlist.id,
						status: existingWaitlist.status,
						createdAt: existingWaitlist.createdAt,
					},
				};
			}

			// Add to waitlist
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
				message: 'Added to waitlist',
				data: {
					id: waitlist.id,
					status: waitlist.status,
					createdAt: waitlist.createdAt,
				},
			};
		} catch (error: any) {
			console.error('Error in joinWaitlist:', error);
			return {
				success: false,
				message: 'Failed to join waitlist',
				error: error.message,
			};
		}
	}

	/**
	 * Update waitlist status
	 */
	static async updateWaitlistStatus(email: string, projectKey: string, status: WaitlistStatus, env: Env): Promise<WaitlistResult> {
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

			// Find the waitlist entry
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
					message: 'Not on waitlist',
					error: 'Contact is not on the waitlist for this project',
				};
			}

			// Update the waitlist status
			const updateData: any = {
				status,
				updatedAt: new Date(),
			};

			// If status is NOTIFIED, set notifiedAt
			if (status === 'NOTIFIED') {
				updateData.notifiedAt = new Date();
			}

			const updatedWaitlist = await prisma.waitlist.update({
				where: {
					id: waitlist.id,
				},
				data: updateData,
			});

			return {
				success: true,
				message: `Waitlist status updated to ${status}`,
				data: {
					id: updatedWaitlist.id,
					status: updatedWaitlist.status,
					updatedAt: updatedWaitlist.updatedAt,
					notifiedAt: updatedWaitlist.notifiedAt,
				},
			};
		} catch (error: any) {
			console.error('Error in updateWaitlistStatus:', error);
			return {
				success: false,
				message: 'Failed to update waitlist status',
				error: error.message,
			};
		}
	}

	/**
	 * Get waitlist status
	 */
	static async getWaitlistStatus(email: string, projectKey: string, env: Env): Promise<WaitlistResult> {
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

			// Find the waitlist entry
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
					message: 'Not on waitlist',
					data: { status: 'NONE' },
				};
			}

			return {
				success: true,
				message: 'Waitlist status found',
				data: {
					id: waitlist.id,
					status: waitlist.status,
					createdAt: waitlist.createdAt,
					updatedAt: waitlist.updatedAt,
					notifiedAt: waitlist.notifiedAt,
				},
			};
		} catch (error: any) {
			console.error('Error in getWaitlistStatus:', error);
			return {
				success: false,
				message: 'Failed to get waitlist status',
				error: error.message,
			};
		}
	}

	/**
	 * Get all contacts on a project waitlist
	 */
	static async getWaitlistContacts(projectKey: string, env: Env, status?: WaitlistStatus): Promise<WaitlistResult> {
		const prisma = getPrismaClient(env);

		try {
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

			// Build the query
			const whereClause: any = {
				productId: project.id,
			};

			if (status) {
				whereClause.status = status;
			}

			// Get waitlist entries with contact information
			const waitlistEntries = await prisma.waitlist.findMany({
				where: whereClause,
				include: {
					contact: true,
				},
				orderBy: {
					createdAt: 'asc',
				},
			});

			// Format the response
			const formattedEntries = waitlistEntries.map((entry: any) => ({
				id: entry.id,
				email: entry.contact.emailAddress,
				displayName: entry.contact.displayName,
				status: entry.status,
				createdAt: entry.createdAt,
				updatedAt: entry.updatedAt,
				notifiedAt: entry.notifiedAt,
			}));

			return {
				success: true,
				message: `Found ${formattedEntries.length} waitlist entries`,
				data: formattedEntries,
			};
		} catch (error: any) {
			console.error('Error in getWaitlistContacts:', error);
			return {
				success: false,
				message: 'Failed to get waitlist contacts',
				error: error.message,
			};
		}
	}
}

export default WaitlistService;
