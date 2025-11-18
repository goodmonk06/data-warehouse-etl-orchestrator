import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { PipelineExecutor } from '../engine';

export class CronScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private executor: PipelineExecutor;

  constructor(private prisma: PrismaClient) {
    this.executor = new PipelineExecutor(prisma);
  }

  async start(): Promise<void> {
    console.log('Starting cron scheduler...');

    // Load all enabled pipelines with schedules
    const pipelines = await this.prisma.pipeline.findMany({
      where: {
        enabled: true,
        scheduleCron: {
          not: null,
        },
      },
    });

    console.log(`Found ${pipelines.length} scheduled pipelines`);

    // Schedule each pipeline
    for (const pipeline of pipelines) {
      this.schedulePipeline(pipeline.id, pipeline.scheduleCron!);
    }
  }

  schedulePipeline(pipelineId: string, cronExpression: string): void {
    // Remove existing task if any
    this.unschedulePipeline(pipelineId);

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      console.error(`Invalid cron expression for pipeline ${pipelineId}: ${cronExpression}`);
      return;
    }

    // Create new scheduled task
    const task = cron.schedule(cronExpression, async () => {
      console.log(`Executing scheduled pipeline: ${pipelineId}`);
      try {
        await this.executor.executePipeline(pipelineId);
      } catch (error) {
        console.error(`Scheduled pipeline execution failed: ${pipelineId}`, error);
      }
    });

    this.tasks.set(pipelineId, task);
    console.log(`Scheduled pipeline ${pipelineId} with cron: ${cronExpression}`);
  }

  unschedulePipeline(pipelineId: string): void {
    const task = this.tasks.get(pipelineId);
    if (task) {
      task.stop();
      this.tasks.delete(pipelineId);
      console.log(`Unscheduled pipeline: ${pipelineId}`);
    }
  }

  async stop(): Promise<void> {
    console.log('Stopping cron scheduler...');
    for (const [pipelineId, task] of this.tasks) {
      task.stop();
      console.log(`Stopped task for pipeline: ${pipelineId}`);
    }
    this.tasks.clear();
  }

  async reload(): Promise<void> {
    console.log('Reloading scheduled pipelines...');
    await this.stop();
    await this.start();
  }
}
