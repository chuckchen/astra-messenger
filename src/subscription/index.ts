import { Hono } from 'hono';

import { subscribe, unsubscribe } from './subscription';

const subscriptionRouter = new Hono<{ Bindings: Env }>().basePath('/api/subscription');

// Subscribe request handler
subscriptionRouter.post('/', async (c) => {
	const { email, project, type } = await c.req.json();

	if (!email || !project) {
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Email and project are required',
			},
			{ status: 400 },
		);
	}

	const result = await subscribe({ email, project, type }, c.env);

	if (result.error) {
		console.error(`Subscribe failed with ${result.error}`);
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Subscription failed',
				error: result.error,
			},
			{ status: 400 },
		);
	}

	return c.json(
		{
			success: true,
			code: 200,
			message: 'Subscription updated',
		},
		{ status: 200 },
	);
});

// Unsubscribe request handler
subscriptionRouter.delete('/', async (c) => {
	const { email, project } = await c.req.json();

	if (!email || !project) {
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Email and project are required',
			},
			{ status: 400 },
		);
	}

	const result = await unsubscribe({ email, project }, c.env);

	if (result.error) {
		console.error(`Unsubscribe failed with ${result.error}`);
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Unsubscription failed',
				error: result.error,
			},
			{ status: 400 },
		);
	}

	return c.json(
		{
			success: true,
			code: 200,
			message: 'Subscription deleted',
		},
		{ status: 200 },
	);
});

export default subscriptionRouter;
