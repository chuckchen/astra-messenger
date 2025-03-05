import { Context, Next } from 'hono';

export interface ApiResponse<T = any> {
	success: boolean;
	code: number;
	message: string;
	data?: T;
}

export const responseHandler = async (c: Context, next: Next) => {
	try {
		await next();
	} catch (error: any) {
		c.status(500);
		return c.json({
			success: false,
			code: 500,
			message: `Internal Server Error: ${error.message}`,
		});
	}
};
