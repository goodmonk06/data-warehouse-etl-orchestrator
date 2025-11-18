import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransformTemplateService } from '../../services/TransformTemplateService';
import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../utils/errors';

// Mock Prisma
const mockPrisma = {
  transformTemplate: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  pipeline: {
    count: vi.fn(),
  },
} as unknown as PrismaClient;

describe('TransformTemplateService', () => {
  let service: TransformTemplateService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TransformTemplateService(mockPrisma);
  });

  describe('create', () => {
    it('should create a new transform template', async () => {
      const dto = {
        name: 'Remove Nulls',
        description: 'Removes null values from dataset',
        category: 'cleaning',
        code: 'return data.filter(row => Object.values(row).every(v => v !== null));',
        tags: ['cleaning', 'nulls'],
      };

      const mockTemplate = {
        id: 'template-1',
        ...dto,
        version: '1.0.0',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        parameters: null,
      };

      vi.mocked(mockPrisma.transformTemplate.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.transformTemplate.create).mockResolvedValue(mockTemplate);

      const result = await service.create(dto);

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.transformTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: dto.name,
          category: dto.category,
          code: dto.code,
          version: '1.0.0',
          isActive: true,
        }),
      });
    });

    it('should throw validation error for invalid category', async () => {
      const dto = {
        name: 'Invalid Template',
        category: 'invalid-category',
        code: 'return data;',
      };

      await expect(service.create(dto as any)).rejects.toThrow(ValidationError);
      expect(mockPrisma.transformTemplate.create).not.toHaveBeenCalled();
    });

    it('should throw validation error for duplicate name', async () => {
      const dto = {
        name: 'Existing Template',
        category: 'cleaning',
        code: 'return data;',
      };

      vi.mocked(mockPrisma.transformTemplate.findFirst).mockResolvedValue({
        id: 'existing-id',
        name: 'Existing Template',
      } as any);

      await expect(service.create(dto)).rejects.toThrow(ValidationError);
      expect(mockPrisma.transformTemplate.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all templates without filters', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Template 1',
          category: 'cleaning',
          _count: { pipelines: 2 },
        },
        {
          id: 'template-2',
          name: 'Template 2',
          category: 'enrichment',
          _count: { pipelines: 0 },
        },
      ];

      vi.mocked(mockPrisma.transformTemplate.findMany).mockResolvedValue(mockTemplates as any);

      const result = await service.findAll();

      expect(result).toEqual(mockTemplates);
      expect(mockPrisma.transformTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { pipelines: true },
          },
        },
      });
    });

    it('should filter by category', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Cleaning Template',
          category: 'cleaning',
          _count: { pipelines: 1 },
        },
      ];

      vi.mocked(mockPrisma.transformTemplate.findMany).mockResolvedValue(mockTemplates as any);

      const result = await service.findAll({ category: 'cleaning' });

      expect(result).toEqual(mockTemplates);
      expect(mockPrisma.transformTemplate.findMany).toHaveBeenCalledWith({
        where: { category: 'cleaning' },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { pipelines: true },
          },
        },
      });
    });

    it('should filter by isActive status', async () => {
      vi.mocked(mockPrisma.transformTemplate.findMany).mockResolvedValue([]);

      await service.findAll({ isActive: true });

      expect(mockPrisma.transformTemplate.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { pipelines: true },
          },
        },
      });
    });

    it('should filter by tags', async () => {
      vi.mocked(mockPrisma.transformTemplate.findMany).mockResolvedValue([]);

      await service.findAll({ tags: ['cleaning', 'validation'] });

      expect(mockPrisma.transformTemplate.findMany).toHaveBeenCalledWith({
        where: {
          tags: {
            hasSome: ['cleaning', 'validation'],
          },
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { pipelines: true },
          },
        },
      });
    });
  });

  describe('findById', () => {
    it('should return a template by id', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        category: 'cleaning',
        pipelines: [
          { id: 'pipeline-1', name: 'Pipeline 1', isActive: true },
        ],
      };

      vi.mocked(mockPrisma.transformTemplate.findUnique).mockResolvedValue(mockTemplate as any);

      const result = await service.findById('template-1');

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.transformTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-1' },
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
    });

    it('should throw NotFoundError if template does not exist', async () => {
      vi.mocked(mockPrisma.transformTemplate.findUnique).mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('should update a template', async () => {
      const existingTemplate = {
        id: 'template-1',
        name: 'Old Name',
        category: 'cleaning',
      };

      const updatedTemplate = {
        ...existingTemplate,
        name: 'New Name',
        description: 'Updated description',
      };

      vi.mocked(mockPrisma.transformTemplate.findUnique).mockResolvedValue(existingTemplate as any);
      vi.mocked(mockPrisma.transformTemplate.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.transformTemplate.update).mockResolvedValue(updatedTemplate as any);

      const result = await service.update('template-1', {
        name: 'New Name',
        description: 'Updated description',
      });

      expect(result).toEqual(updatedTemplate);
      expect(mockPrisma.transformTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: expect.objectContaining({
          name: 'New Name',
          description: 'Updated description',
        }),
      });
    });

    it('should throw NotFoundError if template does not exist', async () => {
      vi.mocked(mockPrisma.transformTemplate.findUnique).mockResolvedValue(null);

      await expect(service.update('nonexistent-id', { name: 'New Name' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw validation error for duplicate name', async () => {
      const existingTemplate = {
        id: 'template-1',
        name: 'Template 1',
      };

      const duplicateTemplate = {
        id: 'template-2',
        name: 'Template 2',
      };

      vi.mocked(mockPrisma.transformTemplate.findUnique).mockResolvedValue(existingTemplate as any);
      vi.mocked(mockPrisma.transformTemplate.findFirst).mockResolvedValue(duplicateTemplate as any);

      await expect(service.update('template-1', { name: 'Template 2' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw validation error for invalid category', async () => {
      const existingTemplate = {
        id: 'template-1',
        name: 'Template 1',
      };

      vi.mocked(mockPrisma.transformTemplate.findUnique).mockResolvedValue(existingTemplate as any);

      await expect(
        service.update('template-1', { category: 'invalid-category' } as any)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('delete', () => {
    it('should delete a template', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Template 1',
        category: 'cleaning',
      };

      vi.mocked(mockPrisma.transformTemplate.findUnique).mockResolvedValue(mockTemplate as any);
      vi.mocked(mockPrisma.pipeline.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.transformTemplate.delete).mockResolvedValue(mockTemplate as any);

      await service.delete('template-1');

      expect(mockPrisma.transformTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
    });

    it('should throw NotFoundError if template does not exist', async () => {
      vi.mocked(mockPrisma.transformTemplate.findUnique).mockResolvedValue(null);

      await expect(service.delete('nonexistent-id')).rejects.toThrow(NotFoundError);
    });

    it('should throw validation error if template is in use', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Template 1',
      };

      vi.mocked(mockPrisma.transformTemplate.findUnique).mockResolvedValue(mockTemplate as any);
      vi.mocked(mockPrisma.pipeline.count).mockResolvedValue(3);

      await expect(service.delete('template-1')).rejects.toThrow(ValidationError);
      expect(mockPrisma.transformTemplate.delete).not.toHaveBeenCalled();
    });
  });

  describe('clone', () => {
    it('should clone a template with new version', async () => {
      const sourceTemplate = {
        id: 'template-1',
        name: 'Original Template',
        description: 'Original description',
        category: 'cleaning',
        version: '1.0.0',
        code: 'return data;',
        parameters: { threshold: 0.5 },
        tags: ['cleaning'],
        pipelines: [],
      };

      const clonedTemplate = {
        id: 'template-2',
        name: 'Original Template (Copy)',
        description: 'Original description',
        category: 'cleaning',
        version: '1.0.1',
        code: 'return data;',
        parameters: { threshold: 0.5 },
        tags: ['cleaning'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.transformTemplate.findUnique).mockResolvedValue(sourceTemplate as any);
      vi.mocked(mockPrisma.transformTemplate.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.transformTemplate.create).mockResolvedValue(clonedTemplate);

      const result = await service.clone('template-1', {});

      expect(result).toEqual(clonedTemplate);
      expect(mockPrisma.transformTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Original Template (Copy)',
          version: '1.0.1',
          code: 'return data;',
        }),
      });
    });

    it('should clone with custom name and version', async () => {
      const sourceTemplate = {
        id: 'template-1',
        name: 'Original Template',
        category: 'cleaning',
        version: '1.0.0',
        code: 'return data;',
        pipelines: [],
      };

      vi.mocked(mockPrisma.transformTemplate.findUnique).mockResolvedValue(sourceTemplate as any);
      vi.mocked(mockPrisma.transformTemplate.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.transformTemplate.create).mockResolvedValue({
        ...sourceTemplate,
        id: 'template-2',
        name: 'Custom Name',
        version: '2.0.0',
      } as any);

      await service.clone('template-1', {
        name: 'Custom Name',
        version: '2.0.0',
      });

      expect(mockPrisma.transformTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Custom Name',
          version: '2.0.0',
        }),
      });
    });
  });

  describe('validateCode', () => {
    it('should validate correct code', async () => {
      const code = 'return data.filter(row => row.value > 0);';

      const result = await service.validateCode(code);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should detect syntax errors', async () => {
      const code = 'return data.filter(row => row.value > ;'; // Missing closing parenthesis

      const result = await service.validateCode(code);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should detect missing return statement', async () => {
      const code = 'data.filter(row => row.value > 0);'; // No return statement

      const result = await service.validateCode(code);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template code must include a return statement');
    });
  });

  describe('findByCategory', () => {
    it('should return templates for a specific category', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Template 1',
          category: 'cleaning',
          isActive: true,
        },
        {
          id: 'template-2',
          name: 'Template 2',
          category: 'cleaning',
          isActive: true,
        },
      ];

      vi.mocked(mockPrisma.transformTemplate.findMany).mockResolvedValue(mockTemplates as any);

      const result = await service.findByCategory('cleaning');

      expect(result).toEqual(mockTemplates);
      expect(mockPrisma.transformTemplate.findMany).toHaveBeenCalledWith({
        where: {
          category: 'cleaning',
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });
    });
  });
});
