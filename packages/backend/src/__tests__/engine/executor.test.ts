import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PipelineExecutor } from '../../engine/executor';

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    pipeline: {
      findUnique: vi.fn(),
    },
    pipelineRun: {
      create: vi.fn(),
      update: vi.fn(),
    },
  })),
}));

// Mock connectors
vi.mock('../../connectors', () => ({
  PostgresSourceConnector: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    extract: vi.fn().mockResolvedValue([
      { id: 1, name: 'Test 1' },
      { id: 2, name: 'Test 2' },
    ]),
  })),
  ApiSourceConnector: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    extract: vi.fn().mockResolvedValue([]),
  })),
  DuckDBTargetConnector: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    load: vi.fn(),
  })),
}));

// Mock fs promises
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

describe('PipelineExecutor', () => {
  let executor: PipelineExecutor;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    executor = new PipelineExecutor(mockPrisma);
    vi.clearAllMocks();
  });

  it('should create an executor instance', () => {
    expect(executor).toBeInstanceOf(PipelineExecutor);
  });

  it('should throw error if pipeline not found', async () => {
    vi.mocked(mockPrisma.pipeline.findUnique).mockResolvedValue(null);

    await expect(executor.executePipeline('non-existent-id')).rejects.toThrow(
      'Pipeline non-existent-id not found'
    );
  });

  it('should throw error if pipeline is disabled', async () => {
    const mockPipeline = {
      id: 'test-id',
      name: 'Test Pipeline',
      enabled: false,
      source: { id: 'src-1', type: 'postgres', configJson: {} },
      target: { id: 'tgt-1', type: 'duckdb', configJson: {} },
    };

    vi.mocked(mockPrisma.pipeline.findUnique).mockResolvedValue(mockPipeline);

    await expect(executor.executePipeline('test-id')).rejects.toThrow(
      'Pipeline test-id is disabled'
    );
  });

  it('should execute pipeline successfully', async () => {
    const mockPipeline = {
      id: 'test-id',
      name: 'Test Pipeline',
      enabled: true,
      source: {
        id: 'src-1',
        name: 'Test Source',
        type: 'postgres',
        configJson: {
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'test',
          password: 'test',
          query: 'SELECT * FROM test',
        }
      },
      target: {
        id: 'tgt-1',
        name: 'Test Target',
        type: 'duckdb',
        configJson: {
          dbPath: './test.duckdb',
          tableName: 'test_table',
        }
      },
      transformScriptPath: null,
    };

    const mockRun = {
      id: 'run-1',
      pipelineId: 'test-id',
      status: 'running',
      statsJson: {},
    };

    vi.mocked(mockPrisma.pipeline.findUnique).mockResolvedValue(mockPipeline);
    vi.mocked(mockPrisma.pipelineRun.create).mockResolvedValue(mockRun);
    vi.mocked(mockPrisma.pipelineRun.update).mockResolvedValue({ ...mockRun, status: 'success' });

    const runId = await executor.executePipeline('test-id');

    expect(runId).toBe('run-1');
    expect(mockPrisma.pipelineRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pipelineId: 'test-id',
          status: 'running',
        }),
      })
    );
    expect(mockPrisma.pipelineRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-1' },
        data: expect.objectContaining({
          status: 'success',
          finishedAt: expect.any(Date),
        }),
      })
    );
  });
});
