/**
 * Message Processor Service
 *
 * Handles processing of scheduled and retry messages for the cron job.
 * Extracted from the main index.ts to improve separation of concerns.
 */

import { EMAIL_CONFIG } from '../config';
import type { EmailProvider } from '../types';
import { getProvider, parseTemplateVariables } from './email-utils';
import EmailService from './emails';
import MessageLogService from './message-log';
import { calculateNextRetryTime, shouldRetry } from './retry-service';
import type { MessageWithRelations } from './scheduler-service';
import SchedulerService from './scheduler-service';
import TemplateService from './templates';

/**
 * Process a single message (scheduled or retry)
 *
 * @param message - The message to process
 * @param env - Cloudflare environment bindings
 * @param _ctx - Execution context (unused but kept for compatibility)
 */
export async function processMessage(message: MessageWithRelations, env: Env, _ctx: ExecutionContext): Promise<void> {
	try {
		// Lock the message to prevent duplicate processing
		const messageId = typeof message.id === 'string' ? message.id : String(message.id);
		const locked = await SchedulerService.lockMessage(messageId, env);
		if (!locked) {
			console.warn(`Message ${messageId} already being processed, skipping`);
			return;
		}

		console.info(`Processing message ${messageId}, attempt ${message.attempts + 1}/${message.maxAttempts}`);

		// Determine email content based on whether this is a template email or direct email
		const provider = getProvider(message.provider || undefined);

		if (message.template) {
			// Template-based email
			await processTemplateMessage(message, provider, env);
		} else {
			// Direct email - not supported for retries yet
			console.warn(`Message ${messageId} is a direct email without template, cannot retry`);
			return;
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const messageId = typeof message.id === 'string' ? message.id : String(message.id);
		console.error(`Error processing message ${messageId}: ${errorMessage}`);
	}
}

/**
 * Process a template-based email message
 *
 * @param message - The message to process
 * @param provider - Email provider to use
 * @param env - Cloudflare environment bindings
 */
async function processTemplateMessage(message: MessageWithRelations, provider: EmailProvider, env: Env): Promise<void> {
	const messageId = typeof message.id === 'string' ? message.id : String(message.id);

	if (!message.template) {
		console.error(`Template not found in message ${messageId}`);
		return;
	}

	// Parse template variables
	const variables = parseTemplateVariables(message.variables || null);

	// Get processed template
	const processedTemplate = await TemplateService.getProcessedTemplate(message.template.key, variables, env);

	if (!processedTemplate) {
		console.error(`Template not found for message ${messageId}: ${message.template.key}`);
		await MessageLogService.updateMessageLog(
			messageId,
			{ success: false, code: 404, message: 'Template not found', retriable: false },
			env,
			{ attempts: message.attempts + 1 },
		);
		return;
	}

	// Build email request
	const emailRequest = {
		to: message.contact.emailAddress,
		from: EMAIL_CONFIG.DEFAULT_SENDER,
		templateName: message.template.key,
		templateVariables: variables,
		provider,
	};

	// Send the email
	const result = await EmailService.sendTemplateEmail(emailRequest, env);

	// Calculate retry info
	const newAttempts = message.attempts + 1;
	const canRetry = result.retriable && shouldRetry(newAttempts, message.maxAttempts);
	const nextRetryAt = canRetry ? calculateNextRetryTime(newAttempts) : undefined;

	// Update message log
	await MessageLogService.updateMessageLog(messageId, result, env, {
		attempts: newAttempts,
		nextRetryAt,
		provider,
	});

	// Log result
	if (result.success) {
		console.info(`✓ Message ${messageId} sent successfully`);
	} else if (canRetry) {
		console.warn(`⚠ Message ${messageId} failed, will retry at ${nextRetryAt?.toISOString()}`);
	} else {
		console.error(`✗ Message ${messageId} failed permanently: ${result.message}`);
	}
}
