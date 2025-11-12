import { AwsClient } from 'aws4fetch';

import type { ProviderResponse } from '../types';

let aws: AwsClient | null = null;

const send = async (
	{ to, from, subject, text, html }: { to: string | string[]; from: string; subject: string; text: string; html: string },
	env: Env,
): Promise<ProviderResponse> => {
	const accessKey = env.AWS_ACCESS_KEY_ID;
	const secretKey = env.AWS_SECRET_ACCESS_KEY;
	const region = env.AWS_REGION ?? 'us-west-2';

	if (!accessKey || !secretKey) {
		throw new Error('AWS access key or secret key not configured');
	}

	// Create an AwsClient instance
	if (!aws) {
		aws = new AwsClient({
			accessKeyId: accessKey,
			secretAccessKey: secretKey,
			region: region,
			service: 'ses',
		});
	}

	// Create JSON payload instead of URLSearchParams
	const payload = {
		Action: 'SendEmail',
		Source: from,
		Destination: {
			ToAddresses: Array.isArray(to) ? to : [to],
		},
		Message: {
			Subject: {
				Data: subject,
			},
			Body: {
				Text: {
					Data: text,
				},
				Html: {
					Data: html,
				},
			},
		},
	};

	try {
		// Send the email using SES
		const response = await aws.fetch(`https://email.${region}.amazonaws.com/v2/email/outbound-emails`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (response.status === 200 || response.status === 201) {
			const data = await response.json();
			const id = (data as { MessageId?: string }).MessageId;
			console.info(`Email sent to ${JSON.stringify(to)}, message id: ${id}"`);
			return { code: 201, message: `Email sent to ${JSON.stringify(to)}`, data: { id }, retriable: false };
		}

		// Handle specific AWS SES error codes
		if (response.status === 400) {
			console.error(`Bad request - invalid parameters for ${JSON.stringify(to)}`);
			return { code: 400, message: 'Invalid parameters', retriable: false };
		}

		if (response.status === 403) {
			console.error('AWS credentials invalid or insufficient permissions');
			return { code: 403, message: 'Authentication/authorization error', retriable: false };
		}

		if (response.status === 429) {
			console.error('AWS SES rate limit exceeded');
			return { code: 429, message: 'Rate limit exceeded', retriable: true };
		}

		// Server errors (500+) are retriable
		if (response.status >= 500) {
			console.error(`AWS SES server error: ${response.status}`);
			return { code: response.status, message: 'Server error', retriable: true };
		}

		console.error(`Failed to send email to ${JSON.stringify(to)} for "${subject}", status: ${response.status}`);
		return { code: 500, message: `Failed to send email to ${JSON.stringify(to)}`, retriable: true };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`Network or unknown error: ${errorMessage}`);
		// Network errors are retriable
		return { code: 500, message: errorMessage, retriable: true };
	}
};

export default send;
