import { PrismaClient, DataQualityRule, DataQualityResult } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../lib/logger';
import { metrics, MetricNames } from '../lib/metrics';

export interface CreateDataQualityRuleDto {
  pipelineId: string;
  name: string;
  description?: string;
  ruleType: 'schema' | 'completeness' | 'uniqueness' | 'range' | 'custom';
  config: any;
  severity?: 'critical' | 'warning' | 'info';
  isActive?: boolean;
}

export interface UpdateDataQualityRuleDto {
  name?: string;
  description?: string;
  ruleType?: 'schema' | 'completeness' | 'uniqueness' | 'range' | 'custom';
  config?: any;
  severity?: 'critical' | 'warning' | 'info';
  isActive?: boolean;
}

export interface QualityCheckResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  score: number;
  violations: number;
  message: string;
  details?: any;
}

export class DataQualityService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new data quality rule
   */
  async createRule(dto: CreateDataQualityRuleDto): Promise<DataQualityRule> {
    logger.info('Creating data quality rule', { pipelineId: dto.pipelineId, name: dto.name });

    // Validate pipeline exists
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: dto.pipelineId },
    });

    if (!pipeline) {
      throw new NotFoundError('Pipeline', dto.pipelineId);
    }

    const rule = await this.prisma.dataQualityRule.create({
      data: {
        pipelineId: dto.pipelineId,
        name: dto.name,
        description: dto.description,
        ruleType: dto.ruleType,
        config: dto.config,
        severity: dto.severity || 'warning',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    logger.info('Data quality rule created', { id: rule.id });

    return rule;
  }

  /**
   * Get all rules for a pipeline
   */
  async getRulesByPipeline(pipelineId: string): Promise<DataQualityRule[]> {
    const rules = await this.prisma.dataQualityRule.findMany({
      where: { pipelineId },
      orderBy: [{ severity: 'desc' }, { name: 'asc' }],
    });

    return rules;
  }

  /**
   * Get active rules for a pipeline
   */
  async getActiveRulesByPipeline(pipelineId: string): Promise<DataQualityRule[]> {
    const rules = await this.prisma.dataQualityRule.findMany({
      where: {
        pipelineId,
        isActive: true,
      },
      orderBy: [{ severity: 'desc' }, { name: 'asc' }],
    });

    return rules;
  }

  /**
   * Get a single rule by ID
   */
  async getRuleById(id: string): Promise<DataQualityRule> {
    const rule = await this.prisma.dataQualityRule.findUnique({
      where: { id },
      include: {
        pipeline: {
          select: {
            id: true,
            name: true,
          },
        },
        results: {
          orderBy: { checkedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!rule) {
      throw new NotFoundError('DataQualityRule', id);
    }

    return rule;
  }

  /**
   * Update a data quality rule
   */
  async updateRule(id: string, dto: UpdateDataQualityRuleDto): Promise<DataQualityRule> {
    logger.info('Updating data quality rule', { id });

    // Check if rule exists
    await this.getRuleById(id);

    const rule = await this.prisma.dataQualityRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.ruleType !== undefined && { ruleType: dto.ruleType }),
        ...(dto.config !== undefined && { config: dto.config }),
        ...(dto.severity !== undefined && { severity: dto.severity }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    logger.info('Data quality rule updated', { id });

    return rule;
  }

  /**
   * Delete a data quality rule
   */
  async deleteRule(id: string): Promise<void> {
    logger.info('Deleting data quality rule', { id });

    // Check if rule exists
    await this.getRuleById(id);

    await this.prisma.dataQualityRule.delete({
      where: { id },
    });

    logger.info('Data quality rule deleted', { id });
  }

  /**
   * Run quality checks on data for a pipeline
   */
  async checkDataQuality(
    pipelineId: string,
    runId: string,
    data: any[]
  ): Promise<{
    overallScore: number;
    passed: boolean;
    results: QualityCheckResult[];
  }> {
    logger.info('Running data quality checks', { pipelineId, runId, rowCount: data.length });

    const rules = await this.getActiveRulesByPipeline(pipelineId);

    if (rules.length === 0) {
      logger.info('No active quality rules found for pipeline', { pipelineId });
      return {
        overallScore: 100,
        passed: true,
        results: [],
      };
    }

    const results: QualityCheckResult[] = [];

    for (const rule of rules) {
      try {
        const result = await this.executeRule(rule, data);
        results.push(result);

        // Record result in database
        await this.prisma.dataQualityResult.create({
          data: {
            ruleId: rule.id,
            runId,
            passed: result.passed,
            score: result.score,
            violations: result.violations,
            message: result.message,
            checkedAt: new Date(),
            details: result.details,
          },
        });

        // Record metrics
        await metrics.recordGauge(MetricNames.DATA_QUALITY_SCORE, result.score, {
          pipeline: pipelineId,
          rule: rule.name,
        });

        if (result.violations > 0) {
          await metrics.incrementCounter(MetricNames.DATA_QUALITY_VIOLATIONS, {
            pipeline: pipelineId,
            rule: rule.name,
            severity: rule.severity,
          });
        }
      } catch (error: any) {
        logger.error('Error executing quality rule', {
          ruleId: rule.id,
          error: error.message,
        });

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          passed: false,
          score: 0,
          violations: 0,
          message: `Rule execution failed: ${error.message}`,
        });
      }
    }

    // Calculate overall score
    const overallScore = results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 100;

    // Check if any critical rules failed
    const criticalFailures = results.filter(
      (r) => !r.passed && rules.find((rule) => rule.id === r.ruleId)?.severity === 'critical'
    );

    const passed = criticalFailures.length === 0;

    logger.info('Data quality checks completed', {
      pipelineId,
      runId,
      overallScore,
      passed,
      totalRules: results.length,
    });

    return {
      overallScore,
      passed,
      results,
    };
  }

  /**
   * Get quality check results for a run
   */
  async getResultsByRun(runId: string): Promise<DataQualityResult[]> {
    const results = await this.prisma.dataQualityResult.findMany({
      where: { runId },
      include: {
        rule: {
          select: {
            id: true,
            name: true,
            ruleType: true,
            severity: true,
          },
        },
      },
      orderBy: { checkedAt: 'desc' },
    });

    return results;
  }

  /**
   * Execute a single quality rule
   */
  private async executeRule(rule: DataQualityRule, data: any[]): Promise<QualityCheckResult> {
    const config = rule.config as any;

    switch (rule.ruleType) {
      case 'completeness': {
        // Check if required fields are not null/undefined
        const fields = config.fields || [];
        const threshold = config.threshold || 1.0; // Default 100% complete

        let violations = 0;
        for (const row of data) {
          for (const field of fields) {
            if (row[field] === null || row[field] === undefined || row[field] === '') {
              violations++;
            }
          }
        }

        const totalChecks = data.length * fields.length;
        const score = totalChecks > 0 ? ((totalChecks - violations) / totalChecks) * 100 : 100;
        const passed = score >= threshold * 100;

        return {
          ruleId: rule.id,
          ruleName: rule.name,
          passed,
          score,
          violations,
          message: passed
            ? `Completeness check passed (${score.toFixed(2)}%)`
            : `Completeness check failed (${score.toFixed(2)}%, threshold: ${threshold * 100}%)`,
          details: {
            totalRows: data.length,
            fields,
            violationCount: violations,
          },
        };
      }

      case 'uniqueness': {
        // Check if field values are unique
        const field = config.field;
        const values = new Set();
        let duplicates = 0;

        for (const row of data) {
          const value = row[field];
          if (values.has(value)) {
            duplicates++;
          } else {
            values.add(value);
          }
        }

        const score = data.length > 0 ? ((data.length - duplicates) / data.length) * 100 : 100;
        const passed = duplicates === 0;

        return {
          ruleId: rule.id,
          ruleName: rule.name,
          passed,
          score,
          violations: duplicates,
          message: passed
            ? 'Uniqueness check passed'
            : `Found ${duplicates} duplicate values in field '${field}'`,
          details: {
            field,
            totalRows: data.length,
            uniqueValues: values.size,
            duplicates,
          },
        };
      }

      case 'range': {
        // Check if numeric values are within range
        const field = config.field;
        const min = config.min;
        const max = config.max;
        let violations = 0;

        for (const row of data) {
          const value = row[field];
          if (typeof value === 'number' && (value < min || value > max)) {
            violations++;
          }
        }

        const score = data.length > 0 ? ((data.length - violations) / data.length) * 100 : 100;
        const passed = violations === 0;

        return {
          ruleId: rule.id,
          ruleName: rule.name,
          passed,
          score,
          violations,
          message: passed
            ? `Range check passed (${min} to ${max})`
            : `Found ${violations} values outside range (${min} to ${max})`,
          details: {
            field,
            min,
            max,
            totalRows: data.length,
            violationCount: violations,
          },
        };
      }

      case 'schema': {
        // Validate data matches expected schema/pattern
        const field = config.field;
        const pattern = config.pattern;
        const regex = new RegExp(pattern);
        let violations = 0;

        for (const row of data) {
          const value = String(row[field] || '');
          if (!regex.test(value)) {
            violations++;
          }
        }

        const score = data.length > 0 ? ((data.length - violations) / data.length) * 100 : 100;
        const passed = violations === 0;

        return {
          ruleId: rule.id,
          ruleName: rule.name,
          passed,
          score,
          violations,
          message: passed
            ? 'Schema validation passed'
            : `Found ${violations} values not matching pattern`,
          details: {
            field,
            pattern,
            totalRows: data.length,
            violationCount: violations,
          },
        };
      }

      case 'custom': {
        // Custom rule - execute provided code
        // In production, this should be sandboxed
        const code = config.code;
        const checkFunction = new Function('data', 'config', code);
        const result = checkFunction(data, config);

        return {
          ruleId: rule.id,
          ruleName: rule.name,
          passed: result.passed || false,
          score: result.score || 0,
          violations: result.violations || 0,
          message: result.message || 'Custom rule executed',
          details: result.details,
        };
      }

      default:
        throw new ValidationError(`Unsupported rule type: ${rule.ruleType}`);
    }
  }
}
