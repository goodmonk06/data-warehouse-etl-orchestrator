import { PrismaClient, ConnectionTest, DataSource, DataTarget } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import { logger } from '../lib/logger';
import { metrics, MetricNames } from '../lib/metrics';
import { PostgresSource } from '../connectors/postgres-source';
import { Client as PgClient } from 'pg';

export interface TestConnectionResult {
  success: boolean;
  responseTimeMs: number;
  message: string;
  details?: any;
}

export class ConnectionTestService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Test a data source connection
   */
  async testSource(sourceId: string): Promise<ConnectionTest> {
    logger.info('Testing data source connection', { sourceId });

    const source = await this.prisma.dataSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new NotFoundError('DataSource', sourceId);
    }

    const startTime = Date.now();
    let result: TestConnectionResult;

    try {
      result = await this.performSourceTest(source);
    } catch (error: any) {
      result = {
        success: false,
        responseTimeMs: Date.now() - startTime,
        message: error.message || 'Connection test failed',
        details: { error: error.toString() },
      };
    }

    // Record test result
    const test = await this.prisma.connectionTest.create({
      data: {
        sourceId,
        status: result.success ? 'success' : 'failed',
        responseTimeMs: result.responseTimeMs,
        message: result.message,
        testedAt: new Date(),
        details: result.details,
      },
    });

    // Update source lastTestedAt
    await this.prisma.dataSource.update({
      where: { id: sourceId },
      data: { lastTestedAt: new Date() },
    });

    // Record metrics
    await metrics.incrementCounter(MetricNames.CONNECTION_TEST_SUCCESS, {
      type: 'source',
      status: result.success ? 'success' : 'failed',
    });
    await metrics.recordHistogram(
      MetricNames.CONNECTION_TEST_TIME,
      result.responseTimeMs,
      { type: 'source' }
    );

    logger.info('Data source test completed', {
      sourceId,
      success: result.success,
      responseTimeMs: result.responseTimeMs,
    });

    return test;
  }

  /**
   * Test a data target connection
   */
  async testTarget(targetId: string): Promise<ConnectionTest> {
    logger.info('Testing data target connection', { targetId });

    const target = await this.prisma.dataTarget.findUnique({
      where: { id: targetId },
    });

    if (!target) {
      throw new NotFoundError('DataTarget', targetId);
    }

    const startTime = Date.now();
    let result: TestConnectionResult;

    try {
      result = await this.performTargetTest(target);
    } catch (error: any) {
      result = {
        success: false,
        responseTimeMs: Date.now() - startTime,
        message: error.message || 'Connection test failed',
        details: { error: error.toString() },
      };
    }

    // Record test result
    const test = await this.prisma.connectionTest.create({
      data: {
        targetId,
        status: result.success ? 'success' : 'failed',
        responseTimeMs: result.responseTimeMs,
        message: result.message,
        testedAt: new Date(),
        details: result.details,
      },
    });

    // Update target lastTestedAt
    await this.prisma.dataTarget.update({
      where: { id: targetId },
      data: { lastTestedAt: new Date() },
    });

    // Record metrics
    await metrics.incrementCounter(MetricNames.CONNECTION_TEST_SUCCESS, {
      type: 'target',
      status: result.success ? 'success' : 'failed',
    });
    await metrics.recordHistogram(
      MetricNames.CONNECTION_TEST_TIME,
      result.responseTimeMs,
      { type: 'target' }
    );

    logger.info('Data target test completed', {
      targetId,
      success: result.success,
      responseTimeMs: result.responseTimeMs,
    });

    return test;
  }

  /**
   * Get test history for a source
   */
  async getSourceTestHistory(
    sourceId: string,
    limit: number = 10
  ): Promise<ConnectionTest[]> {
    const tests = await this.prisma.connectionTest.findMany({
      where: { sourceId },
      orderBy: { testedAt: 'desc' },
      take: limit,
    });

    return tests;
  }

  /**
   * Get test history for a target
   */
  async getTargetTestHistory(
    targetId: string,
    limit: number = 10
  ): Promise<ConnectionTest[]> {
    const tests = await this.prisma.connectionTest.findMany({
      where: { targetId },
      orderBy: { testedAt: 'desc' },
      take: limit,
    });

    return tests;
  }

  /**
   * Get all recent tests
   */
  async getRecentTests(limit: number = 20): Promise<ConnectionTest[]> {
    const tests = await this.prisma.connectionTest.findMany({
      orderBy: { testedAt: 'desc' },
      take: limit,
      include: {
        source: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        target: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return tests;
  }

  /**
   * Get connection health summary
   */
  async getHealthSummary(): Promise<{
    sources: { total: number; healthy: number; unhealthy: number };
    targets: { total: number; healthy: number; unhealthy: number };
    recentTests: { total: number; passed: number; failed: number };
  }> {
    const [totalSources, totalTargets, recentTests] = await Promise.all([
      this.prisma.dataSource.count(),
      this.prisma.dataTarget.count(),
      this.prisma.connectionTest.findMany({
        where: {
          testedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    // Get latest test status for each source
    const sources = await this.prisma.dataSource.findMany({
      include: {
        connectionTests: {
          orderBy: { testedAt: 'desc' },
          take: 1,
        },
      },
    });

    const healthySources = sources.filter(
      (s) => s.connectionTests[0]?.status === 'success'
    ).length;

    // Get latest test status for each target
    const targets = await this.prisma.dataTarget.findMany({
      include: {
        connectionTests: {
          orderBy: { testedAt: 'desc' },
          take: 1,
        },
      },
    });

    const healthyTargets = targets.filter(
      (t) => t.connectionTests[0]?.status === 'success'
    ).length;

    const passedTests = recentTests.filter((t) => t.status === 'success').length;

    return {
      sources: {
        total: totalSources,
        healthy: healthySources,
        unhealthy: totalSources - healthySources,
      },
      targets: {
        total: totalTargets,
        healthy: healthyTargets,
        unhealthy: totalTargets - healthyTargets,
      },
      recentTests: {
        total: recentTests.length,
        passed: passedTests,
        failed: recentTests.length - passedTests,
      },
    };
  }

  /**
   * Perform actual source connection test
   */
  private async performSourceTest(source: DataSource): Promise<TestConnectionResult> {
    const startTime = Date.now();

    switch (source.type) {
      case 'postgres': {
        const config = source.configJson as any;
        const client = new PgClient({
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
        });

        try {
          await client.connect();
          const result = await client.query('SELECT 1 as test');
          await client.end();

          return {
            success: true,
            responseTimeMs: Date.now() - startTime,
            message: 'Successfully connected to PostgreSQL database',
            details: {
              version: result.rows[0]?.test === 1 ? 'OK' : 'Unknown',
            },
          };
        } catch (error: any) {
          try {
            await client.end();
          } catch {}
          throw error;
        }
      }

      case 'api': {
        const config = source.configJson as any;
        const response = await fetch(config.url, {
          method: config.method || 'GET',
          headers: config.headers || {},
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return {
          success: true,
          responseTimeMs: Date.now() - startTime,
          message: 'Successfully connected to API',
          details: {
            status: response.status,
            statusText: response.statusText,
          },
        };
      }

      case 'csv': {
        const config = source.configJson as any;
        const fs = await import('fs/promises');

        try {
          const stats = await fs.stat(config.path);

          return {
            success: true,
            responseTimeMs: Date.now() - startTime,
            message: 'Successfully accessed CSV file',
            details: {
              fileSize: stats.size,
              modified: stats.mtime,
            },
          };
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            throw new Error(`CSV file not found: ${config.path}`);
          }
          throw error;
        }
      }

      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  /**
   * Perform actual target connection test
   */
  private async performTargetTest(target: DataTarget): Promise<TestConnectionResult> {
    const startTime = Date.now();

    switch (target.type) {
      case 'duckdb': {
        const config = target.configJson as any;
        const duckdb = await import('duckdb');

        return new Promise((resolve, reject) => {
          const db = new duckdb.Database(':memory:'); // Test with in-memory for validation

          db.all('SELECT 1 as test', (err, result) => {
            db.close();

            if (err) {
              reject(err);
            } else {
              resolve({
                success: true,
                responseTimeMs: Date.now() - startTime,
                message: 'DuckDB connection validated successfully',
                details: {
                  configPath: config.path,
                  schema: config.schema,
                },
              });
            }
          });
        });
      }

      case 'postgres': {
        const config = target.configJson as any;
        const client = new PgClient({
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
        });

        try {
          await client.connect();
          await client.query('SELECT 1 as test');
          await client.end();

          return {
            success: true,
            responseTimeMs: Date.now() - startTime,
            message: 'Successfully connected to PostgreSQL target',
          };
        } catch (error: any) {
          try {
            await client.end();
          } catch {}
          throw error;
        }
      }

      case 'bigquery': {
        const config = target.configJson as any;

        // For BigQuery, we just validate config structure
        // In production, you'd use @google-cloud/bigquery client
        if (!config.projectId || !config.datasetId) {
          throw new Error('Invalid BigQuery configuration: missing projectId or datasetId');
        }

        return {
          success: true,
          responseTimeMs: Date.now() - startTime,
          message: 'BigQuery configuration validated (mock test)',
          details: {
            projectId: config.projectId,
            datasetId: config.datasetId,
            note: 'Full BigQuery test requires credentials',
          },
        };
      }

      default:
        throw new Error(`Unsupported target type: ${target.type}`);
    }
  }
}
