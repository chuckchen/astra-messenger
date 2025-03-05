import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { router as emailRouter } from './email';
import { authHandler } from './middleware/auth-handler';
import { errorHandler } from './middleware/error-handler';
import { rateLimiter } from './middleware/rate-limiter';
import { responseHandler } from './middleware/response-handler';
import { router as subscriptionRouter } from './optout';

const app = new Hono<{ Bindings: Env }>();

// Add global middlewares
app.use('*', cors());
app.use(logger());
app.use(responseHandler);
app.use(rateLimiter);

// Error handler
app.onError(errorHandler);

// Apply auth middleware to all routes
app.use('/api/*', authHandler);

// API routes with versioning
app.route('/api/v1', emailRouter);
app.route('/api/v1', subscriptionRouter);

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
