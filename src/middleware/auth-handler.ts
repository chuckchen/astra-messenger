import { Context, Next } from 'hono';

export const authHandler = async (c: Context, next: Next) => {
	const apiKey = c.req.header('X-API-Key');
	if (!apiKey || apiKey !== c.env.API_AUTH_TOKEN) {
		return c.json(
			{
				success: false,
				code: 401,
				message: 'Unauthorized',
			},
			{ status: 401 },
		);
	}
	await next();
};
