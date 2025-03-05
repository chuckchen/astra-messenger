import { Hono } from 'hono';

import { getPrismaClient } from '../lib/prisma-client';
import { getDisplayName } from '../lib/utils';

const router = new Hono<{ Bindings: Env }>().basePath('/contacts');

router.post('/', async (c) => {
	const { email } = await c.req.json();

	const prisma = getPrismaClient(c.env);

	try {
		await prisma.contact.upsert({
			where: { emailAddress: email },
			update: { displayName: getDisplayName(email) },
			create: { emailAddress: email, displayName: getDisplayName(email) },
		});

		return c.json({ success: true, code: 200, message: 'Contact saved.' }, { status: 200 });
	} catch (error: any) {
		console.error(`Failed to add ${email} to contacts`);
		return c.json({ success: false, code: 500, message: error.message }, { status: 500 });
	}
});

export { router };
