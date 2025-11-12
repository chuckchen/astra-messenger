import { Hono } from 'hono';

import type { SendEmailRequestBody } from '../types';
import { handleDirectEmail, handleTemplateEmail } from './email-handler';

const router = new Hono<{ Bindings: Env }>().basePath('/emails');

// Send email
router.post('/', async (c) => {
	try {
		// Parse the request body
		const body: SendEmailRequestBody = await c.req.json();

		// Determine if this is a direct email or template email
		let result;
		if (body.subject) {
			// Direct content email
			result = await handleDirectEmail(body, c.env, c.executionCtx);
		} else if (body.templateName) {
			// Template-based email
			result = await handleTemplateEmail(body, c.env, c.executionCtx);
		} else {
			// Neither direct nor template specified
			return c.json(
				{
					success: false,
					code: 400,
					message: 'Either subject (for direct email) or templateName (for template email) must be provided',
				},
				{ status: 400 },
			);
		}

		// Return the result with proper status code
		const statusCode = result.code >= 200 && result.code < 600 ? result.code : 500;
		return c.json(result, statusCode as any);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return c.json(
			{
				success: false,
				code: 500,
				message: `Error processing email request: ${errorMessage}`,
			},
			{ status: 500 },
		);
	}
});

export { router };
