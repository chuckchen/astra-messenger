import send from './mail/SesMailer';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware
app.use('*', cors());

// Add logger middleware
app.use(logger());

// Apply auth middleware to all routes
app.use('/api/*', async (c: any, next: () => Promise<void>) => {
	const apiKey = c.req.header('X-API-Key');
	if (!apiKey || apiKey !== c.env.API_KEY) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	await next();
});

app.post('/api/email', async (c) => {
	// Parse the request body
	const { to, from, subject, body } = await c.req.json<any>();

	// Validate input
	if (!to || !from || !subject || !body) {
		return new Response('Missing required fields', { status: 400 });
	}

	try {
		// Send the email using SES
		// This does NOT block / wait
		c.executionCtx.waitUntil(send({ to, from, subject, body }, c.env));

		return new Response('Request received', { status: 201 });
	} catch (error: any) {
		return new Response(`Error sending email: ${error.message}`, { status: 500 });
	}
});

app.all('*', (c) => c.json({ error: 'Method not allowed' }, 405));

export default {
	fetch: app.fetch,
	async scheduled(event, env, ctx) {
		switch (event.cron) {
			case '57 23 * * *':
				console.info('Generate user reports.');
		}
		console.info('cron processed');
	},
} satisfies ExportedHandler<Env>;
