import { getPrismaClient } from '../lib/prisma-client';

/**
 * Unsubscribe a contact from a project
 * Updates the waitlist status to CONVERTED to indicate unsubscription
 */
const unsubscribe = async ({ email, project }: { email: string; project: string }, env: Env): Promise<{ data: number; error: any }> => {
	try {
		const prisma = getPrismaClient(env);

		// Find the contact
		const contact = await prisma.contact.findUnique({
			where: { emailAddress: email },
		});

		if (!contact) {
			return { data: 0, error: `Contact with email ${email} not found` };
		}

		// Find the project
		const projectRecord = await prisma.project.findUnique({
			where: { projectKey: project },
		});

		if (!projectRecord) {
			return { data: 0, error: `Project with key ${project} not found` };
		}

		// Update the waitlist status to CONVERTED to indicate unsubscription
		const result = await prisma.waitlist.updateMany({
			where: {
				contactId: contact.id,
				productId: projectRecord.id,
			},
			data: {
				status: 'CONVERTED', // Using CONVERTED to indicate they've unsubscribed
				updatedAt: new Date(),
			},
		});

		if (result.count === 0) {
			return { data: 0, error: 'No record found' };
		}

		return { data: result.count, error: null };
	} catch (error: any) {
		console.error('Error in unsubscribe:', error);
		return { data: 0, error: error.message };
	}
};

/**
 * Subscribe a contact to a project
 * Creates a new waitlist entry with WAITING status
 */
const subscribe = async (
	{ email, project, type = '' }: { email: string; project: string; type?: string | undefined },
	env: Env,
): Promise<{ data: number; error: any }> => {
	try {
		const prisma = getPrismaClient(env);

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
		const projectRecord = await prisma.project.findUnique({
			where: { projectKey: project },
		});

		if (!projectRecord) {
			return { data: 0, error: `Project with key ${project} not found` };
		}

		// Check if subscription already exists
		const existingWaitlist = await prisma.waitlist.findUnique({
			where: {
				contactId_productId: {
					contactId: contact.id,
					productId: projectRecord.id,
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

				return { data: 1, error: null };
			}

			return { data: 0, error: 'Already subscribed' };
		}

		// Create new subscription
		await prisma.waitlist.create({
			data: {
				contact: {
					connect: { id: contact.id },
				},
				product: {
					connect: { id: projectRecord.id },
				},
				status: 'WAITING',
			},
		});

		return { data: 1, error: null };
	} catch (error: any) {
		console.error('Error in subscribe:', error);
		return { data: 0, error: error.message };
	}
};

export { subscribe, unsubscribe };
