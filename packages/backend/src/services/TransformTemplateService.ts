import { PrismaClient, TransformTemplate } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../lib/logger';
import { metrics, MetricNames } from '../lib/metrics';

export interface CreateTransformTemplateDto {
  name: string;
  description?: string;
  category: string;
  version?: string;
  code: string;
  parameters?: any;
  tags?: string[];
  isActive?: boolean;
}

export interface UpdateTransformTemplateDto {
  name?: string;
  description?: string;
  category?: string;
  version?: string;
  code?: string;
  parameters?: any;
  tags?: string[];
  isActive?: boolean;
}

export class TransformTemplateService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new transform template
   */
  async create(dto: CreateTransformTemplateDto): Promise<TransformTemplate> {
    logger.info('Creating transform template', { name: dto.name, category: dto.category });

    // Validate category
    const validCategories = ['cleaning', 'enrichment', 'aggregation', 'validation', 'custom'];
    if (!validCategories.includes(dto.category)) {
      throw new ValidationError(
        `Invalid category. Must be one of: ${validCategories.join(', ')}`
      );
    }

    // Check for name uniqueness
    const existing = await this.prisma.transformTemplate.findFirst({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ValidationError(`Transform template with name "${dto.name}" already exists`);
    }

    const template = await this.prisma.transformTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        version: dto.version || '1.0.0',
        code: dto.code,
        parameters: dto.parameters,
        tags: dto.tags,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    await metrics.incrementCounter('transform_template.created', {
      category: dto.category,
    });

    logger.info('Transform template created successfully', { id: template.id });

    return template;
  }

  /**
   * Get all transform templates with optional filtering
   */
  async findAll(options?: {
    category?: string;
    isActive?: boolean;
    tags?: string[];
  }): Promise<TransformTemplate[]> {
    const where: any = {};

    if (options?.category) {
      where.category = options.category;
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options?.tags && options.tags.length > 0) {
      where.tags = {
        hasSome: options.tags,
      };
    }

    const templates = await this.prisma.transformTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { pipelines: true },
        },
      },
    });

    return templates;
  }

  /**
   * Get a single transform template by ID
   */
  async findById(id: string): Promise<TransformTemplate> {
    const template = await this.prisma.transformTemplate.findUnique({
      where: { id },
      include: {
        pipelines: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundError('TransformTemplate', id);
    }

    return template;
  }

  /**
   * Update a transform template
   */
  async update(id: string, dto: UpdateTransformTemplateDto): Promise<TransformTemplate> {
    logger.info('Updating transform template', { id });

    // Check if template exists
    await this.findById(id);

    // Validate category if provided
    if (dto.category) {
      const validCategories = ['cleaning', 'enrichment', 'aggregation', 'validation', 'custom'];
      if (!validCategories.includes(dto.category)) {
        throw new ValidationError(
          `Invalid category. Must be one of: ${validCategories.join(', ')}`
        );
      }
    }

    // Check for name uniqueness if name is being updated
    if (dto.name) {
      const existing = await this.prisma.transformTemplate.findFirst({
        where: {
          name: dto.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ValidationError(`Transform template with name "${dto.name}" already exists`);
      }
    }

    const template = await this.prisma.transformTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.version !== undefined && { version: dto.version }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.parameters !== undefined && { parameters: dto.parameters }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await metrics.incrementCounter('transform_template.updated');
    logger.info('Transform template updated successfully', { id });

    return template;
  }

  /**
   * Delete a transform template
   */
  async delete(id: string): Promise<void> {
    logger.info('Deleting transform template', { id });

    // Check if template exists
    const template = await this.findById(id);

    // Check if template is in use
    const pipelineCount = await this.prisma.pipeline.count({
      where: { transformTemplateId: id },
    });

    if (pipelineCount > 0) {
      throw new ValidationError(
        `Cannot delete transform template. It is currently used by ${pipelineCount} pipeline(s)`
      );
    }

    await this.prisma.transformTemplate.delete({
      where: { id },
    });

    await metrics.incrementCounter('transform_template.deleted', {
      category: template.category,
    });

    logger.info('Transform template deleted successfully', { id });
  }

  /**
   * Get transform templates by category
   */
  async findByCategory(category: string): Promise<TransformTemplate[]> {
    return this.prisma.transformTemplate.findMany({
      where: {
        category,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Clone a template with a new version
   */
  async clone(
    id: string,
    options: { name?: string; version?: string }
  ): Promise<TransformTemplate> {
    logger.info('Cloning transform template', { id, options });

    const source = await this.findById(id);

    const newTemplate = await this.create({
      name: options.name || `${source.name} (Copy)`,
      description: source.description || undefined,
      category: source.category,
      version: options.version || this.incrementVersion(source.version),
      code: source.code,
      parameters: source.parameters,
      tags: source.tags || undefined,
      isActive: true,
    });

    logger.info('Transform template cloned successfully', {
      sourceId: id,
      newId: newTemplate.id,
    });

    return newTemplate;
  }

  /**
   * Helper to increment semantic version
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    if (parts.length === 3) {
      const patch = parseInt(parts[2], 10);
      return `${parts[0]}.${parts[1]}.${patch + 1}`;
    }
    return '1.0.0';
  }

  /**
   * Validate template code (basic syntax check)
   */
  async validateCode(code: string): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Basic validation - check if it's valid JavaScript
    try {
      // eslint-disable-next-line no-new-func
      new Function('data', code);
    } catch (error: any) {
      errors.push(`Syntax error: ${error.message}`);
    }

    // Check for required structure (must return transformed data)
    if (!code.includes('return')) {
      errors.push('Template code must include a return statement');
    }

    return {
      valid: errors.length === 0,
      ...(errors.length > 0 && { errors }),
    };
  }
}
