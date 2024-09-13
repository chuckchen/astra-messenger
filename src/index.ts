import send from './mail/SesMailer';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { subscribe, unsubscribe } from './subscription/subscription';

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware
app.use('*', cors());

// Add logger middleware
app.use(logger());

// Apply auth middleware to all routes
app.use('/api/*', async (c: any, next: () => Promise<void>) => {
	const apiKey = c.req.header('X-API-Key');
	if (!apiKey || apiKey !== c.env.API_AUTH_TOKEN) {
		return c.json({ message: 'Unauthorized' }, 401);
	}
	await next();
});

// Send email requet handler
app.post('/api/email', async (c) => {
	// Parse the request body
	const { to, from, subject, body } = await c.req.json<any>();

	// Validate input
	if (!to || !from || !subject || !body) {
		return c.json({ message: 'Missing required fields' }, { status: 400 });
	}

	try {
		// Send the email using SES
		// This does NOT block / wait
		c.executionCtx.waitUntil(send({ to, from, subject, body }, c.env));

		return c.json({ message: 'Request received' }, { status: 201 });
	} catch (error: any) {
		return c.json({ message: `Error sending email: ${error.message}` }, { status: 500 });
	}
});

// Subscribe request handler
app.post('/api/subscription', async (c) => {
	const { email, product, type } = await c.req.json();

	const result = await subscribe({ email, product, type }, c.env);

	if (result.error) {
		console.error(`Subscribe failed with ${result.error}`);
		return c.json({ message: 'Subscription failed' }, { status: 400 });
	}

	return c.json({ message: 'Subscription updated' }, { status: 200 });
});

// Unsubscribe request handler
app.delete('/api/subscription', async (c) => {
	const { email, product } = await c.req.json();

	const result = await unsubscribe({ email, product }, c.env);

	if (result.error) {
		console.error(`Unsubscribe failed with ${result.error}`);
		return c.json({ message: 'Unsubscription failed' }, { status: 400 });
	}

	return c.json({ message: 'Unsubscription succeeded' }, { status: 200 });
});

app.all('*', (c) => c.json({ message: 'Method not allowed' }, 405));

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
