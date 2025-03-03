import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | undefined;

export function getPrismaClient(env: Env): PrismaClient {
	if (!prisma) {
		// Create a new PrismaClient instance with D1 adapter
		const adapter = new PrismaD1(env.DB);
		prisma = new PrismaClient({ adapter });
	}
	return prisma;
}
