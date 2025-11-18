import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { PipelineExecutor } from '../engine';
import { z } from 'zod';
import { NotFoundError } from '../utils/errors';
import { TransformTemplateService } from '../services/TransformTemplateService';
import { ConnectionTestService } from '../services/ConnectionTestService';
import { DataQualityService } from '../services/DataQualityService';

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
  transformTemplateId: z.string().uuid().optional(),
  scheduleCron: z.string().optional(),
  enabled: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  retryPolicy: z.record(z.any()).optional(),
  timeoutSeconds: z.number().int().positive().optional(),
  metadata: z.record(z.any()).optional(),
  createdBy: z.string().optional(),
});

const TransformTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum(['cleaning', 'enrichment', 'aggregation', 'validation', 'custom']),
  version: z.string().optional(),
  code: z.string().min(1, 'Code is required'),
  parameters: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const DataQualityRuleSchema = z.object({
  pipelineId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  ruleType: z.enum(['schema', 'completeness', 'uniqueness', 'range', 'custom']),
  config: z.record(z.any()),
  severity: z.enum(['critical', 'warning', 'info']).optional(),
  isActive: z.boolean().optional(),
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

  // ===== Transform Templates =====
  const templateService = new TransformTemplateService(prisma);

  app.get('/api/transform-templates', async (request) => {
    const { category, isActive, tags } = request.query as {
      category?: string;
      isActive?: string;
      tags?: string;
    };

    const options: any = {};
    if (category) options.category = category;
    if (isActive !== undefined) options.isActive = isActive === 'true';
    if (tags) options.tags = tags.split(',');

    const templates = await templateService.findAll(options);
    return templates;
  });

  app.get('/api/transform-templates/:id', async (request) => {
    const { id } = request.params as { id: string };
    const template = await templateService.findById(id);
    return template;
  });

  app.post('/api/transform-templates', async (request) => {
    const data = TransformTemplateSchema.parse(request.body);
    const template = await templateService.create(data);
    return template;
  });

  app.put('/api/transform-templates/:id', async (request) => {
    const { id } = request.params as { id: string };
    const data = TransformTemplateSchema.partial().parse(request.body);
    const template = await templateService.update(id, data);
    return template;
  });

  app.delete('/api/transform-templates/:id', async (request) => {
    const { id } = request.params as { id: string };
    await templateService.delete(id);
    return { success: true };
  });

  app.post('/api/transform-templates/:id/clone', async (request) => {
    const { id } = request.params as { id: string };
    const { name, version } = request.body as { name?: string; version?: string };
    const template = await templateService.clone(id, { name, version });
    return template;
  });

  app.post('/api/transform-templates/validate', async (request) => {
    const { code } = request.body as { code: string };
    const result = await templateService.validateCode(code);
    return result;
  });

  // ===== Connection Testing =====
  const connectionTestService = new ConnectionTestService(prisma);

  app.post('/api/sources/:id/test', async (request) => {
    const { id } = request.params as { id: string };
    const result = await connectionTestService.testSource(id);
    return result;
  });

  app.post('/api/targets/:id/test', async (request) => {
    const { id } = request.params as { id: string };
    const result = await connectionTestService.testTarget(id);
    return result;
  });

  app.get('/api/sources/:id/test-history', async (request) => {
    const { id } = request.params as { id: string };
    const { limit } = request.query as { limit?: string };
    const history = await connectionTestService.getSourceTestHistory(
      id,
      limit ? parseInt(limit, 10) : 10
    );
    return history;
  });

  app.get('/api/targets/:id/test-history', async (request) => {
    const { id } = request.params as { id: string };
    const { limit } = request.query as { limit?: string };
    const history = await connectionTestService.getTargetTestHistory(
      id,
      limit ? parseInt(limit, 10) : 10
    );
    return history;
  });

  app.get('/api/connection-tests', async (request) => {
    const { limit } = request.query as { limit?: string };
    const tests = await connectionTestService.getRecentTests(
      limit ? parseInt(limit, 10) : 20
    );
    return tests;
  });

  app.get('/api/connection-health', async () => {
    const health = await connectionTestService.getHealthSummary();
    return health;
  });

  // ===== Data Quality Rules =====
  const dataQualityService = new DataQualityService(prisma);

  app.post('/api/data-quality-rules', async (request) => {
    const data = DataQualityRuleSchema.parse(request.body);
    const rule = await dataQualityService.createRule(data);
    return rule;
  });

  app.get('/api/pipelines/:pipelineId/data-quality-rules', async (request) => {
    const { pipelineId } = request.params as { pipelineId: string };
    const rules = await dataQualityService.getRulesByPipeline(pipelineId);
    return rules;
  });

  app.get('/api/data-quality-rules/:id', async (request) => {
    const { id } = request.params as { id: string };
    const rule = await dataQualityService.getRuleById(id);
    return rule;
  });

  app.put('/api/data-quality-rules/:id', async (request) => {
    const { id } = request.params as { id: string };
    const data = DataQualityRuleSchema.partial().parse(request.body);
    const rule = await dataQualityService.updateRule(id, data);
    return rule;
  });

  app.delete('/api/data-quality-rules/:id', async (request) => {
    const { id } = request.params as { id: string };
    await dataQualityService.deleteRule(id);
    return { success: true };
  });

  app.get('/api/runs/:runId/data-quality-results', async (request) => {
    const { runId } = request.params as { runId: string };
    const results = await dataQualityService.getResultsByRun(runId);
    return results;
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
