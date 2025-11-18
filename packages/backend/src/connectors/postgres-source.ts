import { Client } from 'pg';
import { SourceConnector, PostgresSourceConfig } from './types';

export class PostgresSourceConnector implements SourceConnector {
  private client: Client;
  private config: PostgresSourceConfig;

  constructor(config: PostgresSourceConfig) {
    this.config = config;
    this.client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  async extract(): Promise<any[]> {
    const result = await this.client.query(this.config.query);
    return result.rows;
  }
}
