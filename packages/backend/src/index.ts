import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { PipelineExecutor } from './engine';
import { registerRoutes } from './api';

const prisma = new PrismaClient();
const executor = new PipelineExecutor(prisma);

const app = Fastify({
  logger: true,
});

async function start() {
  try {
    // Register CORS
    await app.register(cors, {
      origin: true,
    });

    // Register routes
    await registerRoutes(app, prisma, executor);

    // Error handler
    app.setErrorHandler((error, request, reply) => {
      app.log.error(error);
      reply.status(500).send({
        error: error.message || 'Internal Server Error',
      });
    });

    // Start server
    const port = parseInt(process.env.API_PORT || '3001');
    const host = process.env.API_HOST || '0.0.0.0';

    await app.listen({ port, host });
    console.log(`API server listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  await app.close();
  process.exit(0);
});

start();
