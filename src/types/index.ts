/**
 * Core type definitions for Astra Messenger
 */

// Email provider types
export type EmailProvider = 'ses' | 'resend' | 'mailersend';

// Email response interface
export interface EmailResponse {
	success: boolean;
	code: number;
	message: string;
	data?: {
		id?: string;
		[key: string]: unknown;
	};
	retriable?: boolean;
}

// Provider response (internal to provider clients)
export interface ProviderResponse {
	code: number;
	message: string;
	data?: {
		id?: string;
		[key: string]: unknown;
	};
	retriable?: boolean;
}

// Email request interfaces
export interface BaseEmailRequest {
	to: string | string[];
	from: string;
	provider?: EmailProvider;
}

export interface TemplateEmailRequest extends BaseEmailRequest {
	templateName: string;
	templateVariables: Record<string, string | number | boolean>;
}

export interface DirectEmailRequest extends BaseEmailRequest {
	subject: string;
	body: string;
	html: string;
}

// Scheduled message (from database with relations)
// This matches the structure returned by Prisma with includes
export interface ScheduledMessage {
	id: number | string;
	contactId: number;
	templateId: number | null;
	scheduledAt: Date | null;
	status: string;
	attempts: number;
	maxAttempts: number;
	nextRetryAt: Date | null;
	variables: string | null;
	provider: string | null;
	contact: {
		emailAddress: string;
		[key: string]: any;
	};
	template: {
		key: string;
		[key: string]: any;
	} | null;
	[key: string]: any; // Allow other Prisma fields
}

// Message log update data
export interface MessageLogUpdateData {
	attempts?: number;
	nextRetryAt?: Date;
	provider?: string;
}

// API request body for sending emails
export interface SendEmailRequestBody {
	to: string | string[];
	from: string;
	subject?: string;
	body?: string;
	html?: string;
	templateName?: string;
	templateVariables?: Record<string, string | number | boolean>;
	provider?: EmailProvider;
	sendAt?: string;
}

// Email sending parameters (processed and ready to send)
export interface EmailSendParams {
	to: string[];
	from: string;
	subject: string;
	text: string;
	html: string;
	provider: EmailProvider;
}
