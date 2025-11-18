import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiSourceConnector } from '../../connectors/api-source';
import type { ApiSourceConfig } from '../../connectors/types';

// Mock fetch
global.fetch = vi.fn();

describe('ApiSourceConnector', () => {
  let connector: ApiSourceConnector;
  let mockConfig: ApiSourceConfig;

  beforeEach(() => {
    mockConfig = {
      url: 'https://api.example.com/data',
      method: 'GET',
    };
    connector = new ApiSourceConnector(mockConfig);
    vi.clearAllMocks();
  });

  it('should create a connector with valid config', () => {
    expect(connector).toBeInstanceOf(ApiSourceConnector);
  });

  it('should extract data from API', async () => {
    const mockData = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ];

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await connector.extract();

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      mockConfig.url,
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  it('should extract nested data using dataPath', async () => {
    const mockResponse = {
      data: {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      },
    };

    const configWithPath: ApiSourceConfig = {
      ...mockConfig,
      dataPath: 'data.items',
    };
    const connectorWithPath = new ApiSourceConnector(configWithPath);

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await connectorWithPath.extract();

    expect(result).toEqual(mockResponse.data.items);
  });

  it('should handle API errors', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(connector.extract()).rejects.toThrow('HTTP error! status: 500');
  });

  it('should wrap non-array responses in array', async () => {
    const mockData = { id: 1, name: 'Single Item' };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await connector.extract();

    expect(result).toEqual([mockData]);
  });
});
