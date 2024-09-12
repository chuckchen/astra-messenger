import send from './mail/SesMailer';

export default {
	async fetch(request, env, ctx) {
		// Check if the request is authenticated
		if (!isAuthenticated(request, env)) {
			return new Response('Unauthorized', { status: 401 });
		}

		// Parse the request body
		const { to, from, subject, body } = await request.json<any>();

		// Validate input
		if (!to || !from || !subject || !body) {
			return new Response('Missing required fields', { status: 400 });
		}

		try {
			// Send the email using SES
			// This does NOT block / wait
			ctx.waitUntil(send({ to, from, subject, body }, env));

			return new Response('Request received', { status: 201 });
		} catch (error: any) {
			return new Response(`Error sending email: ${error.message}`, { status: 500 });
		}
	},

	async scheduled(event, env, ctx) {
		switch (event.cron) {
			case '57 23 * * *':
				console.info('Generate user reports.');
		}
		console.info('cron processed');
	},
} satisfies ExportedHandler<Env>;

function isAuthenticated(request: any, env: any) {
	// Implement your authentication logic here
	// This could involve checking for a specific header, token, or integrating with Cloudflare Access
	const authToken = request.headers.get('X-Auth-Token');
	return authToken === env.API_AUTH_TOKEN; // Replace with your actual authentication logic
}
