import { Hono } from 'hono';

import TemplateOptOutService from './optout-service';

const router = new Hono<{ Bindings: Env }>().basePath('/optouts');

// Opt out an email address from a template
router.post('/', async (c) => {
	const { email, template, reason } = await c.req.json();

	if (!email || !template) {
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Email and project are required',
			},
			{ status: 400 },
		);
	}

	const result = await TemplateOptOutService.addOptOut(email, template, reason, c.env);

	if (result.error) {
		console.error(`Opt Out failed with ${result.error}`);
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Opt Out failed',
				error: result.error,
			},
			{ status: 400 },
		);
	}

	return c.json(
		{
			success: true,
			code: 200,
			message: 'Opt Out updated',
		},
		{ status: 200 },
	);
});

// Remove the opt out from an email address
router.delete('/:email', async (c) => {
	const email = c.req.param('email');
	const { template } = await c.req.json();

	if (!email || !template) {
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Email and project are required',
			},
			{ status: 400 },
		);
	}

	const result = await TemplateOptOutService.removeOptOut(email, template, c.env);

	if (result.error) {
		console.error(`Opt out failed with ${result.error}`);
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Opt out failed',
				error: result.error,
			},
			{ status: 400 },
		);
	}

	return c.json(
		{
			success: true,
			code: 200,
			message: 'Opt out deleted',
		},
		{ status: 200 },
	);
});

export { router };
