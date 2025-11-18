import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { PipelineExecutor } from '../engine';
import { z } from 'zod';
import { NotFoundError } from '../utils/errors';

// Validation schemas
const DataSourceSchema = z.object({
  name: z.string(),
  type: z.enum(['postgres', 'api', 'csv']),
  configJson: z.record(z.any()),
});

const DataTargetSchema = z.object({
  name: z.string(),
  type: z.enum(['duckdb', 'postgres', 'bigquery']),
  configJson: z.record(z.any()),
});

const PipelineSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  transformScriptPath: z.string().optional(),
  scheduleCron: z.string().optional(),
  enabled: z.boolean().optional(),
});

export async function registerRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  executor: PipelineExecutor
) {
  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // ===== Data Sources =====
  app.get('/api/sources', async () => {
    const sources = await prisma.dataSource.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return sources;
  });

  app.get('/api/sources/:id', async (request) => {
    const { id } = request.params as { id: string };
    const source = await prisma.dataSource.findUnique({
      where: { id },
      include: { pipelines: true },
    });
    if (!source) {
      throw new NotFoundError('Source', id);
    }
    return source;
  });

  app.post('/api/sources', async (request) => {
    const data = DataSourceSchema.parse(request.body);
    const source = await prisma.dataSource.create({ data });
    return source;
  });

  app.put('/api/sources/:id', async (request) => {
    const { id } = request.params as { id: string };
    const data = DataSourceSchema.partial().parse(request.body);
    const source = await prisma.dataSource.update({
      where: { id },
      data,
    });
    return source;
  });

  app.delete('/api/sources/:id', async (request) => {
    const { id } = request.params as { id: string };
    await prisma.dataSource.delete({ where: { id } });
    return { success: true };
  });

  // ===== Data Targets =====
  app.get('/api/targets', async () => {
    const targets = await prisma.dataTarget.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return targets;
  });

  app.get('/api/targets/:id', async (request) => {
    const { id } = request.params as { id: string };
    const target = await prisma.dataTarget.findUnique({
      where: { id },
      include: { pipelines: true },
    });
    if (!target) {
      throw new NotFoundError('Target', id);
    }
    return target;
  });

  app.post('/api/targets', async (request) => {
    const data = DataTargetSchema.parse(request.body);
    const target = await prisma.dataTarget.create({ data });
    return target;
  });

  app.put('/api/targets/:id', async (request) => {
    const { id } = request.params as { id: string };
    const data = DataTargetSchema.partial().parse(request.body);
    const target = await prisma.dataTarget.update({
      where: { id },
      data,
    });
    return target;
  });

  app.delete('/api/targets/:id', async (request) => {
    const { id } = request.params as { id: string };
    await prisma.dataTarget.delete({ where: { id } });
    return { success: true };
  });

  // ===== Pipelines =====
  app.get('/api/pipelines', async () => {
    const pipelines = await prisma.pipeline.findMany({
      include: {
        source: true,
        target: true,
        _count: { select: { runs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return pipelines;
  });

  app.get('/api/pipelines/:id', async (request) => {
    const { id } = request.params as { id: string };
    const pipeline = await prisma.pipeline.findUnique({
      where: { id },
      include: {
        source: true,
        target: true,
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!pipeline) {
      throw new NotFoundError('Pipeline', id);
    }
    return pipeline;
  });

  app.post('/api/pipelines', async (request) => {
    const data = PipelineSchema.parse(request.body);
    const pipeline = await prisma.pipeline.create({ data });
    return pipeline;
  });

  app.put('/api/pipelines/:id', async (request) => {
    const { id } = request.params as { id: string };
    const data = PipelineSchema.partial().parse(request.body);
    const pipeline = await prisma.pipeline.update({
      where: { id },
      data,
    });
    return pipeline;
  });

  app.delete('/api/pipelines/:id', async (request) => {
    const { id } = request.params as { id: string };
    await prisma.pipeline.delete({ where: { id } });
    return { success: true };
  });

  // ===== Pipeline Runs =====
  app.get('/api/pipelines/:id/runs', async (request) => {
    const { id } = request.params as { id: string };
    const runs = await prisma.pipelineRun.findMany({
      where: { pipelineId: id },
      orderBy: { startedAt: 'desc' },
    });
    return runs;
  });

  app.get('/api/runs/:id', async (request) => {
    const { id } = request.params as { id: string };
    const run = await prisma.pipelineRun.findUnique({
      where: { id },
      include: { pipeline: true },
    });
    if (!run) {
      throw new NotFoundError('Run', id);
    }
    return run;
  });

  app.post('/api/pipelines/:id/execute', async (request) => {
    const { id } = request.params as { id: string };
    const runId = await executor.executePipeline(id);
    return { runId, message: 'Pipeline execution started' };
  });
}
