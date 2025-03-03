import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import emailRouter from './mail';
import { errorHandler, rateLimiter, responseHandler } from './middleware/response';
import subscriptionRouter from './subscription';
import waitlistRouter from './waitlist';

const app = new Hono<{ Bindings: Env }>();

// Add global middlewares
app.use('*', cors());
app.use(logger());
app.use(responseHandler);
app.use(rateLimiter);

// Error handler
app.onError(errorHandler);

// Apply auth middleware to all routes
app.use('/api/*', async (c, next: () => Promise<void>) => {
	const apiKey = c.req.header('X-API-Key');
	if (!apiKey || apiKey !== c.env.API_AUTH_TOKEN) {
		return c.json(
			{
				success: false,
				code: 401,
				message: 'Unauthorized',
			},
			{ status: 401 },
		);
	}
	await next();
});

// Email API routes
app.route('/', emailRouter);

// Subscription API routes
app.route('/', subscriptionRouter);

// Waitlist API routes
app.route('/', waitlistRouter);

app.all('*', (c) => c.json({ message: 'Method not allowed' }, 405));

export default {
	fetch: app.fetch,
	async scheduled(event, env, ctx) {
		switch (event.cron) {
			case '57 23 * * *':
				console.info('Generate mail reports.');
		}
		console.info('cron processed');
	},
} satisfies ExportedHandler<Env>;
