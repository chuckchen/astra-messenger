import { Context } from 'hono';

export const errorHandler = async (err: Error, c: Context) => {
	console.error(`Error processing request: ${err.message}`);
	c.status(500);
	return c.json({
		success: false,
		code: 500,
		message: `Internal Server Error: ${err.message}`,
	});
};
