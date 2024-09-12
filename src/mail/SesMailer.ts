import { AwsClient } from 'aws4fetch';

let aws: AwsClient | null;

const send = async (
	{ to, from, subject, body }: { to: string | string[]; from: string; subject: string; body: string },
	env: Env
): Promise<{ code: number; message: string }> => {
	const SES_ENDPOINT = `https://email.${env.AWS_REGION}.amazonaws.com/`;

	// Create an AwsClient instance
	if (aws === null) {
		aws = new AwsClient({
			accessKeyId: env.AWS_ACCESS_KEY_ID,
			secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
			region: env.AWS_REGION,
			service: 'ses',
		});
	}

	// Prepare the SES request payload
	const toFields = Array.isArray(to)
		? to.reduce((acc, e, i) => ({ ...acc, [`Destination.ToAddresses.member.${i}`]: e }), {})
		: { 'Destination.ToAddresses.member.1': to };
	const payload = new URLSearchParams({
		Action: 'SendEmail',
		Source: from,
		...toFields,
		'Message.Subject.Data': subject,
		'Message.Body.Text.Data': body,
	});

	try {
		// Send the email using SES
		const response = await aws.fetch(SES_ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: payload.toString(),
		});

		if (!response.ok) {
			console.error(`Failed to send email  ${JSON.stringify(to)} for "${subject}"`);
			return { code: 500, message: `Failed to send email to ${JSON.stringify(to)}` };
		} else {
			console.info(`Email sent to ${JSON.stringify(to)} for "${subject}"`);
			return { code: 201, message: `Email sent to ${JSON.stringify(to)}` };
		}
	} catch (error: any) {
		console.error(`Unknown error: ${error.message}`);
		return { code: 500, message: error.message };
	}
};

export default send;
