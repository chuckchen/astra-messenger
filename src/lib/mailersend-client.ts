import type { ProviderResponse } from '../types';
import { getEmail } from './utils';

const send = async (
	{ to, from, subject, text, html }: { to: string | string[]; from: string; subject: string; text: string; html: string },
	env: Env,
): Promise<ProviderResponse> => {
	const apiKey = env.MAILERSEND_API_KEY;

	if (!apiKey) {
		throw new Error('MailerSend API key not configured');
	}

	// Format recipients for MailerSend API
	const recipients = (Array.isArray(to) ? to.map((email) => ({ email })) : [{ email: to }]).map(({ email }) => {
		const recipient = getEmail(email);
		return { name: recipient.displayName, email: recipient.emailAddress };
	});

	const sender = getEmail(from);

	const payload = {
		from: { name: sender.displayName, email: sender.emailAddress },
		to: recipients,
		subject,
		text,
		html,
	};

	try {
		// TODO: A paid plan is required to set `headers` or `list_unsubscribe` according to
		// https://developers.mailersend.com/api/v1/email.html#request-parameters
		const response = await fetch('https://api.mailersend.com/v1/email', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				'X-Requested-With': 'XMLHttpRequest',
			},
			body: JSON.stringify(payload),
		});

		if (response.status === 202) {
			const id = response.headers.get('x-message-id') || undefined;
			return { code: 201, message: `Email sent to ${JSON.stringify(to)}: ${id}`, data: { id }, retriable: false };
		}

		if (response.status === 400) {
			console.error(`Incorrect parameters: ${JSON.stringify(payload)}`);
			return { code: 400, message: 'Incorrect parameters', retriable: false };
		}

		if (response.status === 401 || response.status === 403) {
			console.error(`The API key is ${env.MAILERSEND_API_KEY ? 'invalid' : 'missing'}`);
			return { code: 401, message: 'The API key is missing or invalid', retriable: false };
		}

		if (response.status === 422) {
			const data = await response.json();
			console.error(`Invalid data: ${JSON.stringify(data)}, payload: ${JSON.stringify(payload)}`);
			return { code: 422, message: 'The given data is invalid', retriable: false };
		}

		if (response.status === 429) {
			console.error('The rate limit was exceeded');
			return { code: 429, message: 'Too many requests', retriable: true };
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
