import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { CronScheduler } from './scheduler';

const prisma = new PrismaClient();
const scheduler = new CronScheduler(prisma);

async function start() {
  try {
    console.log('Starting ETL worker...');

    if (process.env.ENABLE_SCHEDULER !== 'true') {
      console.log('Scheduler is disabled. Set ENABLE_SCHEDULER=true to enable.');
      return;
    }

    await scheduler.start();
    console.log('ETL worker started successfully');
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await scheduler.stop();
  await prisma.$disconnect();
  process.exit(0);
});

start();
