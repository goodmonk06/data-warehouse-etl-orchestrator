import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PostgresSourceConnector } from '../../connectors/postgres-source';
import type { PostgresSourceConfig } from '../../connectors/types';

// Mock pg Client
vi.mock('pg', () => {
  const mockClient = {
    connect: vi.fn(),
    end: vi.fn(),
    query: vi.fn(),
  };

  return {
    Client: vi.fn(() => mockClient),
  };
});

describe('PostgresSourceConnector', () => {
  let connector: PostgresSourceConnector;
  let mockConfig: PostgresSourceConfig;

  beforeEach(() => {
    mockConfig = {
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      user: 'testuser',
      password: 'testpass',
      query: 'SELECT * FROM test_table',
    };
    connector = new PostgresSourceConnector(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a connector with valid config', () => {
    expect(connector).toBeInstanceOf(PostgresSourceConnector);
  });

  it('should connect to database', async () => {
    await expect(connector.connect()).resolves.not.toThrow();
  });

  it('should extract data from database', async () => {
    const mockRows = [
      { id: 1, name: 'Test 1' },
      { id: 2, name: 'Test 2' },
    ];

    // Get the mocked client instance
    const { Client } = await import('pg');
    const mockClient = new Client();
    vi.mocked(mockClient.query).mockResolvedValue({ rows: mockRows } as any);

    await connector.connect();
    const result = await connector.extract();

    expect(result).toEqual(mockRows);
    expect(mockClient.query).toHaveBeenCalledWith(mockConfig.query);
  });

  it('should disconnect from database', async () => {
    await connector.connect();
    await expect(connector.disconnect()).resolves.not.toThrow();
  });
});
