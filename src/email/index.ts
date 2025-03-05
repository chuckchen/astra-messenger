import { Hono } from 'hono';

import EmailService from './emails';
import MessageLogService from './message-log';

const router = new Hono<{ Bindings: Env }>().basePath('/emails');

// Send email
router.post('/', async (c) => {
	// Parse the request body
	const { to, from, subject, body, html, templateName, templateVariables, provider } = await c.req.json();

	// Validate input
	if (!to || !from) {
		return c.json({ success: false, code: 400, message: 'Missing required fields: to and from' }, { status: 400 });
	}

	// Check if both direct content and template-based email are requested.
	if (templateName && subject) {
		return c.json({ success: false, code: 400, message: 'Conflict params for both template-based and direct content' }, { status: 400 });
	}

	// Send direct content email
	if (subject) {
		if (body && html) {
			try {
				// First log the message
				const loggedMessages = await MessageLogService.logMessage({ to, from, subject }, c.env);

				const sendPromise = EmailService.sendDirectEmail({ to, from, subject, body, html }, c.env);

				// This does NOT block / wait
				c.executionCtx.waitUntil(
					sendPromise.then(async (result) => {
						await Promise.all(
							loggedMessages.map(async (message) => {
								await MessageLogService.updateMessageLog(message.id, result, c.env);
							}),
						);
					}),
				);

				return c.json({ success: true, code: 201, message: 'Request received' }, { status: 201 });
			} catch (error: any) {
				return c.json({ success: false, code: 500, message: `Error sending email: ${error.message}` }, { status: 500 });
			}
		}

		return c.json({ success: false, code: 400, message: 'Missing body text or html' }, { status: 400 });
	}

	// Send template-based email
	if (templateName && !templateVariables) {
		// Additional validation for template usage
		return c.json(
			{
				success: false,
				code: 400,
				message: 'Template variables are required when using a template',
			},
			{ status: 400 },
		);
	}

	try {
		// First log the message
		const loggedMessages = await MessageLogService.logTemplateEmail({ to, from, templateName, templateVariables }, c.env);

		// Send the email using EmailService
		const sendPromise = EmailService.sendTemplateEmail({ to, from, templateName, templateVariables, provider }, c.env);

		// This does NOT block / wait
		c.executionCtx.waitUntil(
			sendPromise.then(async (result) => {
				await Promise.all(
					loggedMessages.map(async (message) => {
						await MessageLogService.updateMessageLog(message.id, result, c.env);
					}),
				);
			}),
		);

		return c.json({ success: true, code: 201, message: 'Request received' }, { status: 201 });
	} catch (error: any) {
		return c.json({ success: false, code: 500, message: `Error sending email: ${error.message}` }, { status: 500 });
	}
});

export { router };
