import { AwsClient } from 'aws4fetch';

let aws: AwsClient | null = null;

const send = async (
	{ to, from, subject, text, html }: { to: string | string[]; from: string; subject: string; text: string; html: string },
	env: Env,
): Promise<{ code: number; message: string }> => {
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

	// Prepare the SES request payload
	const toFields = Array.isArray(to)
		? to.reduce((acc, e, i) => ({ ...acc, [`Destination.ToAddresses.member.${i}`]: e }), {})
		: { 'Destination.ToAddresses.member.1': to };
	const payload = new URLSearchParams({
		Action: 'SendEmail',
		Source: from,
		...toFields,
		'Message.Subject.Data': subject,
		'Message.Body.Text.Data': text,
		'Message.Body.Html.Data': html,
	});

	try {
		// Send the email using SES
		const response = await aws.fetch(`https://email.${region}.amazonaws.com/`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: payload.toString(),
		});

		if (response.ok) {
			console.info(`Email sent to ${JSON.stringify(to)} for "${subject}"`);
			return { code: 201, message: `Email sent to ${JSON.stringify(to)}` };
		}

		console.error(`Failed to send email  ${JSON.stringify(to)} for "${subject}"`);
		return { code: 500, message: `Failed to send email to ${JSON.stringify(to)}` };
	} catch (error: any) {
		console.error(`Unknown error: ${error.message}`);
		return { code: 500, message: error.message };
	}
};

export default send;
