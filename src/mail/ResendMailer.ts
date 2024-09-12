const RESENT_ENDPOINT = 'https://api.resend.com';

const send = async (
	{ to, from, subject, body, html }: { to: string | string[]; from: string; subject: string; body: string; html?: string | undefined },
	env: Env
): Promise<{ code: number; message: string }> => {
	const apiKey = env.RESEND_API_KEY;

	const payload = {
		from,
		to,
		subject,
		text: body,
		html: html,
	};

	try {
		const response = await fetch(RESENT_ENDPOINT, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(payload),
		});

		if (response.ok) {
			const { id } = (await response.json()) as any;
			return { code: 201, message: `Email sent to ${JSON.stringify(to)}: ${id}` };
		}

		if (response.status === 400) {
			console.error(`Incorrect parameters: ${JSON.stringify(payload)}`);
			return { code: 400, message: 'Incorrect parameters' };
		}

		if (response.status === 401 || response.status === 403) {
			console.error(`The API key is ${env.RESEND_API_KEY ? 'invalid' : 'missing'}`);
			return { code: 401, message: `The API key is missing or invalid` };
		}

		if (response.status === 429) {
			console.error('The rate limit was exceeded');
			return { code: 429, message: 'Too many request' };
		}

		console.error(`Unexpected response: ${response.status}`);
		return { code: 500, message: 'Unknown error' };
	} catch (error: any) {
		return { code: 500, message: error.message };
	}
};

export default send;
