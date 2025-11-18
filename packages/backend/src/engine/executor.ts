import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  PostgresSourceConnector,
  ApiSourceConnector,
  DuckDBTargetConnector,
  SourceConnector,
  TargetConnector,
} from '../connectors';

export class PipelineExecutor {
  constructor(private prisma: PrismaClient) {}

  async executePipeline(pipelineId: string): Promise<string> {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: {
        source: true,
        target: true,
      },
    });

    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    if (!pipeline.enabled) {
      throw new Error(`Pipeline ${pipelineId} is disabled`);
    }

    // Create pipeline run
    const run = await this.prisma.pipelineRun.create({
      data: {
        pipelineId,
        status: 'running',
        statsJson: {},
      },
    });

    const logPath = `logs/pipeline-${pipelineId}-${run.id}.log`;
    const logMessages: string[] = [];

    const log = (message: string) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}`;
      logMessages.push(logMessage);
      console.log(logMessage);
    };

    try {
      log(`Starting pipeline execution: ${pipeline.name}`);

      // Extract
      log(`Extracting data from source: ${pipeline.source.name} (${pipeline.source.type})`);
      const sourceConnector = this.createSourceConnector(pipeline.source);
      await sourceConnector.connect();
      const extractedData = await sourceConnector.extract();
      await sourceConnector.disconnect();
      log(`Extracted ${extractedData.length} rows`);

      // Transform
      let transformedData = extractedData;
      if (pipeline.transformScriptPath) {
        log(`Applying transform: ${pipeline.transformScriptPath}`);
        transformedData = await this.applyTransform(pipeline.transformScriptPath, extractedData);
        log(`Transform complete: ${transformedData.length} rows`);
      }

      // Load
      log(`Loading data to target: ${pipeline.target.name} (${pipeline.target.type})`);
      const targetConnector = this.createTargetConnector(pipeline.target);
      await targetConnector.connect();

      const targetConfig = pipeline.target.configJson as any;
      await targetConnector.load(
        targetConfig.tableName,
        transformedData,
        targetConfig.schema
      );

      await targetConnector.disconnect();
      log(`Loaded ${transformedData.length} rows`);

      // Save logs
      await this.saveLog(logPath, logMessages);

      // Update run as successful
      await this.prisma.pipelineRun.update({
        where: { id: run.id },
        data: {
          status: 'success',
          finishedAt: new Date(),
          logPath,
          statsJson: {
            extractedRows: extractedData.length,
            transformedRows: transformedData.length,
            loadedRows: transformedData.length,
          },
        },
      });

      log('Pipeline execution completed successfully');
      return run.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Pipeline execution failed: ${errorMessage}`);

      // Save logs even on failure
      await this.saveLog(logPath, logMessages);

      // Update run as failed
      await this.prisma.pipelineRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          logPath,
          errorMessage,
        },
      });

      throw error;
    }
  }

  private createSourceConnector(source: any): SourceConnector {
    switch (source.type) {
      case 'postgres':
        return new PostgresSourceConnector(source.configJson);
      case 'api':
        return new ApiSourceConnector(source.configJson);
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  private createTargetConnector(target: any): TargetConnector {
    switch (target.type) {
      case 'duckdb':
        return new DuckDBTargetConnector(target.configJson);
      default:
        throw new Error(`Unsupported target type: ${target.type}`);
    }
  }

  private async applyTransform(scriptPath: string, data: any[]): Promise<any[]> {
    const fullPath = path.resolve(process.cwd(), scriptPath);

    try {
      // Dynamic import of the transform module
      const transformModule = await import(fullPath);
      const transform = transformModule.default || transformModule.transform;

      if (typeof transform !== 'function') {
        throw new Error('Transform script must export a default function or a "transform" function');
      }

      return await transform(data);
    } catch (error) {
      throw new Error(`Failed to apply transform: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async saveLog(logPath: string, messages: string[]): Promise<void> {
    const logDir = path.dirname(logPath);
    await fs.mkdir(logDir, { recursive: true });
    await fs.writeFile(logPath, messages.join('\n'), 'utf-8');
  }
}
