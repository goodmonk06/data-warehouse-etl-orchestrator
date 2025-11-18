import { SourceConnector, ApiSourceConfig } from './types';

export class ApiSourceConnector implements SourceConnector {
  private config: ApiSourceConfig;

  constructor(config: ApiSourceConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // No persistent connection for HTTP APIs
  }

  async disconnect(): Promise<void> {
    // No persistent connection for HTTP APIs
  }

  async extract(): Promise<any[]> {
    const response = await fetch(this.config.url, {
      method: this.config.method || 'GET',
      headers: this.config.headers || {},
      body: this.config.body ? JSON.stringify(this.config.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // If dataPath is provided, extract nested data
    if (this.config.dataPath) {
      return this.extractDataByPath(data, this.config.dataPath);
    }

    // If response is an array, return it directly
    if (Array.isArray(data)) {
      return data;
    }

    // Otherwise, wrap in array
    return [data];
  }

  private extractDataByPath(obj: any, path: string): any[] {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        throw new Error(`Path ${path} not found in response`);
      }
    }

    return Array.isArray(current) ? current : [current];
  }
}
