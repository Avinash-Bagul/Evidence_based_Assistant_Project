import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from './index';
import { logger } from '../utils/logger';

const adapter = new PrismaPg({ connectionString: config.databaseUrl });

const prisma = new PrismaClient({
  adapter,
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  logger.debug({ duration: e.duration, query: e.query }, 'Prisma Query');
});

export default prisma;
