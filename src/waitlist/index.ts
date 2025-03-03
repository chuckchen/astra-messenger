import { Hono } from 'hono';

import WaitlistService from './WaitlistService';

const waitlistRouter = new Hono<{ Bindings: Env }>().basePath('/api/waitlist');

// Join a project waitlist
waitlistRouter.post('/', async (c) => {
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

	const result = await WaitlistService.joinWaitlist(email, project, c.env);

	if (!result.success) {
		return c.json(
			{
				success: false,
				code: 400,
				message: result.error || 'Failed to join waitlist',
			},
			{ status: 400 },
		);
	}

	return c.json({ message: result.message, data: result.data }, { status: 201 });
});

// Update waitlist status
waitlistRouter.put('/status', async (c) => {
	const { email, project, status } = await c.req.json();

	if (!email || !project || !status) {
		return c.json({ message: 'Email, project, and status are required' }, { status: 400 });
	}

	// Validate status
	const validStatuses = ['WAITING', 'NOTIFIED', 'CONVERTED'];
	if (!validStatuses.includes(status)) {
		return c.json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
	}

	const result = await WaitlistService.updateWaitlistStatus(email, project, status as any, c.env);

	if (!result.success) {
		return c.json({ message: result.error || 'Failed to update waitlist status' }, { status: 400 });
	}

	return c.json({ message: result.message, data: result.data }, { status: 200 });
});

// Get waitlist status
waitlistRouter.get('/:email/:project', async (c) => {
	const email = c.req.param('email');
	const project = c.req.param('project');

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

	const result = await WaitlistService.getWaitlistStatus(email, project, c.env);

	return c.json(
		{
			success: result.success,
			message: result.message,
			data: result.data,
		},
		{ status: 200 },
	);
});

// Get all contacts on a project waitlist
waitlistRouter.get('/project/:project', async (c) => {
	const project = c.req.param('project');
	const status = c.req.query('status') as any;

	if (!project) {
		return c.json({ message: 'Project is required' }, { status: 400 });
	}

	// Validate status if provided
	if (status && !['WAITING', 'NOTIFIED', 'CONVERTED'].includes(status)) {
		return c.json({ message: 'Invalid status' }, { status: 400 });
	}

	const result = await WaitlistService.getWaitlistContacts(project, c.env, status);

	return c.json(
		{
			success: result.success,
			message: result.message,
			data: result.data,
		},
		{ status: 200 },
	);
});

export default waitlistRouter;
