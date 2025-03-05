const send = async (
	{ to, from, subject, text, html }: { to: string | string[]; from: string; subject: string; text: string; html: string },
	env: Env,
): Promise<{ code: number; message: string }> => {
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
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
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
		console.error(`Unknown error: ${error.message}`);
		return { code: 500, message: error.message };
	}
};

export default send;
