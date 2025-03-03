import { Hono } from 'hono';

import BlacklistService from './BlacklistService';
import EmailService from './EmailService';

const emailRouter = new Hono<{ Bindings: Env }>().basePath('/api/email');

// Unified email sending endpoint
emailRouter.post('/', async (c) => {
	// Parse the request body
	const { to, from, subject, body, html, templateName, templateVariables, provider } = await c.req.json();

	// Validate input
	if (!to || !from) {
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Missing required fields: to and from',
			},
			{ status: 400 },
		);
	}

	// Additional validation for template usage
	if (templateName && !templateVariables) {
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Template variables are required when using a template',
			},
			{ status: 400 },
		);
	}

	// Validate direct email content
	if (!templateName && (!subject || !body)) {
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Subject and body are required when not using a template',
			},
			{ status: 400 },
		);
	}

	try {
		// Send the email using EmailService
		const sendResult = EmailService.sendEmail(
			{
				to,
				from,
				subject,
				body,
				html,
				templateName,
				templateVariables,
				provider,
			},
			c.env,
		);

		// This does NOT block / wait
		c.executionCtx.waitUntil(sendResult);

		return c.json(
			{
				success: true,
				code: 201,
				message: 'Request received',
			},
			{ status: 201 },
		);
	} catch (error: any) {
		return c.json(
			{
				success: false,
				code: 500,
				message: `Error sending email: ${error.message}`,
			},
			{ status: 500 },
		);
	}
});

// Blacklist management endpoints
// Add email to blacklist
emailRouter.post('/blacklist', async (c) => {
	const { email, reason } = await c.req.json();

	if (!email) {
		return c.json({ message: 'Email is required' }, { status: 400 });
	}

	const result = await BlacklistService.addToBlacklist(email, reason || 'Manually blacklisted', c.env);

	if (!result.success) {
		return c.json(
			{
				success: false,
				code: 400,
				message: result.error || 'Failed to blacklist email',
			},
			{ status: 400 },
		);
	}

	return c.json(
		{
			success: true,
			code: 201,
			message: 'Email blacklisted successfully',
		},
		{ status: 201 },
	);
});

// Remove email from blacklist
emailRouter.delete('/blacklist', async (c) => {
	const { email } = await c.req.json();

	if (!email) {
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Email is required',
			},
			{ status: 400 },
		);
	}

	const result = await BlacklistService.removeFromBlacklist(email, c.env);

	if (!result.success) {
		return c.json(
			{
				success: false,
				code: 400,
				message: result.error || 'Failed to remove email from blacklist',
			},
			{ status: 400 },
		);
	}

	return c.json(
		{
			success: true,
			code: 200,
			message: 'Email removed from blacklist successfully',
		},
		{ status: 200 },
	);
});

// Check if email is blacklisted
emailRouter.get('/blacklist/:email', async (c) => {
	const email = c.req.param('email');

	if (!email) {
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Email is required',
			},
			{ status: 400 },
		);
	}

	const result = await BlacklistService.isBlacklisted(email, c.env);

	return c.json(
		{
			success: true,
			code: 200,
			data: {
				isBlacklisted: result.isBlacklisted,
				reason: result.reason,
			},
		},
		{ status: 200 },
	);
});

export default emailRouter;
