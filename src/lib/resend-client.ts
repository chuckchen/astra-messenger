import { EMAIL_CONFIG } from '../config';
import type { ProviderResponse } from '../types';

const send = async (
	{ to, from, subject, text, html }: { to: string | string[]; from: string; subject: string; text: string; html: string },
	env: Env,
): Promise<ProviderResponse> => {
	const apiKey = env.RESEND_API_KEY;

	if (!apiKey) {
		throw new Error('Resend API key not configured');
	}

	const payload = {
		from,
		to,
		subject,
		text,
		html,
	};

	try {
		// TODO: Add list-unsubscribe headers, ref: https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ ...payload, headers: { 'List-Unsubscribe': EMAIL_CONFIG.UNSUBSCRIBE_URL } }),
		});

		if (response.ok) {
			const data = await response.json();
			const id = (data as { id?: string }).id;
			return { code: 201, message: `Email sent to ${JSON.stringify(to)}: ${id}`, data: { id }, retriable: false };
		}

		if (response.status === 400) {
			console.error(`Incorrect parameters: ${JSON.stringify(payload)}}`);
			return { code: 400, message: 'Incorrect parameters', retriable: false };
		}

		if (response.status === 401 || response.status === 403) {
			console.error(`The API key is ${env.RESEND_API_KEY ? 'invalid' : 'missing'}`);
			return { code: 401, message: `The API key is missing or invalid`, retriable: false };
		}

		if (response.status === 422) {
			console.error('Validation error - invalid email or data');
			return { code: 422, message: 'Validation error', retriable: false };
		}

		if (response.status === 429) {
			console.error('The rate limit was exceeded');
			return { code: 429, message: 'Too many request', retriable: true };
		}

		// Server errors (500+) are retriable
		if (response.status >= 500) {
			console.error(`Server error: ${response.status}`);
			return { code: response.status, message: 'Server error', retriable: true };
		}

		console.error(`Unexpected response: ${response.status}`);
		return { code: 500, message: 'Unknown error', retriable: true };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`Network or unknown error: ${errorMessage}`);
		// Network errors are retriable
		return { code: 500, message: errorMessage, retriable: true };
	}
};

export default send;
