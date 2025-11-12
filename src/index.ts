import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { SCHEDULER_CONFIG } from './config';
import { router as emailRouter } from './email';
import { processMessage } from './email/message-processor';
import SchedulerService from './email/scheduler-service';
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
		console.info(`Cron job started: ${event.cron}`);

		try {
			// Process scheduled emails
			const scheduledEmails = await SchedulerService.getScheduledEmails(env, SCHEDULER_CONFIG.SCHEDULED_BATCH_SIZE);
			console.info(`Found ${scheduledEmails.length} scheduled emails to process`);

			for (const message of scheduledEmails) {
				ctx.waitUntil(processMessage(message, env, ctx));
			}

			// Process retry emails
			const retriableEmails = await SchedulerService.getRetriableEmails(env, SCHEDULER_CONFIG.RETRY_BATCH_SIZE);
			console.info(`Found ${retriableEmails.length} emails to retry`);

			for (const message of retriableEmails) {
				ctx.waitUntil(processMessage(message, env, ctx));
			}

			// Legacy report generation (if needed)
			if (event.cron === SCHEDULER_CONFIG.DAILY_REPORT_CRON) {
				console.info('Generate mail reports.');
			}

			console.info('✓ Cron job completed successfully');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`✗ Cron job failed: ${errorMessage}`);
		}
	},
} satisfies ExportedHandler<Env>;
