import { AwsClient } from 'aws4fetch';

let aws: AwsClient | null = null;

const send = async (
	{ to, from, subject, text, html }: { to: string | string[]; from: string; subject: string; text: string; html: string },
	env: Env,
): Promise<{ code: number; message: string; data?: any }> => {
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
			const { MessageId: id } = (await response.json()) as any;
			console.info(`Email sent to ${JSON.stringify(to)}, message id: ${id}"`);
			return { code: 201, message: `Email sent to ${JSON.stringify(to)}`, data: { id } };
		}

		console.error(`Failed to send email  ${JSON.stringify(to)} for "${subject}"`);
		return { code: 500, message: `Failed to send email to ${JSON.stringify(to)}` };
	} catch (error: any) {
		console.error(`Unknown error: ${error.message}`);
		return { code: 500, message: error.message };
	}
};

export default send;
