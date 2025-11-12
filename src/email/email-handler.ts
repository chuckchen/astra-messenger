/**
 * Email Handler
 *
 * Handles business logic for processing email requests.
 * Extracted from the router to improve separation of concerns and testability.
 */

import type { ExecutionContext } from 'hono';

import type { EmailResponse, SendEmailRequestBody } from '../types';
import { getProvider, isFutureDate, parseScheduledDate } from './email-utils';
import EmailService from './emails';
import MessageLogService from './message-log';

/**
 * Result of email request validation
 */
interface ValidationResult {
	valid: boolean;
	error?: string;
	statusCode?: number;
}

/**
 * Validate base email request
 */
function validateBaseRequest(body: SendEmailRequestBody): ValidationResult {
	if (!body.to || !body.from) {
		return {
			valid: false,
			error: 'Missing required fields: to and from',
			statusCode: 400,
		};
	}
	return { valid: true };
}

/**
 * Validate and parse scheduled date
 */
function validateScheduledDate(sendAt: string | undefined): ValidationResult & { scheduledAt?: Date } {
	if (!sendAt) {
		return { valid: true };
	}

	const scheduledAt = parseScheduledDate(sendAt);
	if (!scheduledAt) {
		return {
			valid: false,
			error: 'Invalid sendAt date format. Use ISO 8601 format.',
			statusCode: 400,
		};
	}

	if (!isFutureDate(scheduledAt)) {
		return {
			valid: false,
			error: 'sendAt must be a future date',
			statusCode: 400,
		};
	}

	return { valid: true, scheduledAt };
}

/**
 * Validate email request for conflicts
 */
function validateEmailType(body: SendEmailRequestBody): ValidationResult {
	// Check if both direct content and template-based email are requested
	if (body.templateName && body.subject) {
		return {
			valid: false,
			error: 'Conflict params for both template-based and direct content',
			statusCode: 400,
		};
	}

	// Validate direct email has required fields
	if (body.subject && (!body.body || !body.html)) {
		return {
			valid: false,
			error: 'Missing body text or html',
			statusCode: 400,
		};
	}

	// Validate template email has required fields
	if (body.templateName && !body.templateVariables) {
		return {
			valid: false,
			error: 'Template variables are required when using a template',
			statusCode: 400,
		};
	}

	return { valid: true };
}

/**
 * Handle direct email sending (with or without scheduling)
 */
export async function handleDirectEmail(body: SendEmailRequestBody, env: Env, executionContext: ExecutionContext): Promise<EmailResponse> {
	const { to, from, subject, body: bodyText, html, provider, sendAt } = body;

	// Validate fields
	const baseValidation = validateBaseRequest(body);
	if (!baseValidation.valid) {
		return {
			success: false,
			code: baseValidation.statusCode!,
			message: baseValidation.error!,
		};
	}

	const dateValidation = validateScheduledDate(sendAt);
	if (!dateValidation.valid) {
		return {
			success: false,
			code: dateValidation.statusCode!,
			message: dateValidation.error!,
		};
	}

	const typeValidation = validateEmailType(body);
	if (!typeValidation.valid) {
		return {
			success: false,
			code: typeValidation.statusCode!,
			message: typeValidation.error!,
		};
	}

	if (!subject || !bodyText || !html) {
		return {
			success: false,
			code: 400,
			message: 'Missing required fields for direct email',
		};
	}

	// Log the message with scheduling info
	const loggedMessages = await MessageLogService.logMessage({ to, from, subject }, env, {
		scheduledAt: dateValidation.scheduledAt,
		provider: getProvider(provider),
	});

	// If scheduled for later, just log and return
	if (dateValidation.scheduledAt && isFutureDate(dateValidation.scheduledAt)) {
		return {
			success: true,
			code: 201,
			message: `Email scheduled for ${dateValidation.scheduledAt.toISOString()}`,
			data: {
				scheduledAt: dateValidation.scheduledAt.toISOString(),
				messageIds: loggedMessages.map((m) => m.id),
			},
		};
	}

	// Send immediately (non-blocking)
	const sendPromise = EmailService.sendDirectEmail(
		{
			to,
			from,
			subject,
			body: bodyText,
			html,
			provider: getProvider(provider),
		},
		env,
	);

	// Update message log after sending (non-blocking)
	executionContext.waitUntil(
		sendPromise.then(async (result) => {
			await Promise.all(
				loggedMessages.map(async (message) => {
					await MessageLogService.updateMessageLog(message.id, result, env, { provider: getProvider(provider) });
				}),
			);
		}),
	);

	return {
		success: true,
		code: 201,
		message: 'Request received',
	};
}

/**
 * Handle template email sending (with or without scheduling)
 */
export async function handleTemplateEmail(
	body: SendEmailRequestBody,
	env: Env,
	executionContext: ExecutionContext,
): Promise<EmailResponse> {
	const { to, from, templateName, templateVariables, provider, sendAt } = body;

	// Validate fields
	const baseValidation = validateBaseRequest(body);
	if (!baseValidation.valid) {
		return {
			success: false,
			code: baseValidation.statusCode!,
			message: baseValidation.error!,
		};
	}

	const dateValidation = validateScheduledDate(sendAt);
	if (!dateValidation.valid) {
		return {
			success: false,
			code: dateValidation.statusCode!,
			message: dateValidation.error!,
		};
	}

	const typeValidation = validateEmailType(body);
	if (!typeValidation.valid) {
		return {
			success: false,
			code: typeValidation.statusCode!,
			message: typeValidation.error!,
		};
	}

	if (!templateName || !templateVariables) {
		return {
			success: false,
			code: 400,
			message: 'Missing required fields for template email',
		};
	}

	// Log the message with scheduling info
	const loggedMessages = await MessageLogService.logTemplateEmail({ to, from, templateName, templateVariables }, env, {
		scheduledAt: dateValidation.scheduledAt,
		provider: getProvider(provider),
	});

	// If scheduled for later, just log and return
	if (dateValidation.scheduledAt && isFutureDate(dateValidation.scheduledAt)) {
		return {
			success: true,
			code: 201,
			message: `Email scheduled for ${dateValidation.scheduledAt.toISOString()}`,
			data: {
				scheduledAt: dateValidation.scheduledAt.toISOString(),
				messageIds: loggedMessages.map((m) => m.id),
			},
		};
	}

	// Send immediately (non-blocking)
	const sendPromise = EmailService.sendTemplateEmail(
		{
			to,
			from,
			templateName,
			templateVariables,
			provider: getProvider(provider),
		},
		env,
	);

	// Update message log after sending (non-blocking)
	executionContext.waitUntil(
		sendPromise.then(async (result) => {
			await Promise.all(
				loggedMessages.map(async (message) => {
					await MessageLogService.updateMessageLog(message.id, result, env, { provider: getProvider(provider) });
				}),
			);
		}),
	);

	return {
		success: true,
		code: 201,
		message: 'Request received',
	};
}
